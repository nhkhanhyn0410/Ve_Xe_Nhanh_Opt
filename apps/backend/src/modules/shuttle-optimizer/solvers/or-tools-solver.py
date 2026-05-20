#!/usr/bin/env python3
"""
OR-Tools TSPTW solver subprocess.

Đọc instance JSON từ stdin, ghi solution JSON ra stdout.

Input format (stdin):
{
  "distance_matrix":  [[float, ...], ...]      # km, [0]=start depot, optional [N+1]=end depot
  "duration_matrix":  [[float, ...], ...]      # phút, cùng kích thước
  "time_windows":     [[earliest, latest], ...] # phút từ 00:00, len = N+1
  "service_times":    [int, ...]               # phút, len = N+1
  "depot_start":      int                      # phút (= time_windows[0][0])
  "depot_end":        int                      # phút (= time_windows[0][1])
  "end_depot_index":  int                      # 0 nếu closed, N+1 nếu open
  "customer_count":   int                      # số customer, không tính depot
  "time_limit_seconds": int                    # giới hạn thời gian solver
  "violation_penalty": int                     # phạt soft TW (default 10000)
}

Output format (stdout):
{
  "status":         "OK" | "ERROR",
  "route":          [int, ...]                 # customer indices (0..N-1)
  "total_distance": float                      # km
  "total_duration": float                      # phút
  "arrival_times":  [float, ...]               # phút, theo route
  "violations":     int                        # số TW bị vi phạm
  "error_message":  str | null
}

Cài đặt:
    pip install ortools

Lưu ý: distance/duration float được scale × 1000 để đưa về integer cho OR-Tools.
"""
import json
import sys
import traceback


def main() -> int:
    try:
        raw = sys.stdin.read()
        data = json.loads(raw)
    except Exception as e:
        return write_error(f"Parse stdin failed: {e}")

    try:
        from ortools.constraint_solver import routing_enums_pb2  # type: ignore
        from ortools.constraint_solver import pywrapcp  # type: ignore
    except ImportError:
        return write_error(
            "ortools chưa cài. Chạy: pip install ortools"
        )

    try:
        return solve(data, pywrapcp, routing_enums_pb2)
    except Exception as e:  # noqa: BLE001
        return write_error(
            f"Solver exception: {e}\n{traceback.format_exc()}"
        )


def write_error(msg: str) -> int:
    """Ghi error JSON ra stdout."""
    out = {
        "status": "ERROR",
        "route": [],
        "total_distance": 0.0,
        "total_duration": 0.0,
        "arrival_times": [],
        "violations": 0,
        "error_message": msg,
    }
    sys.stdout.write(json.dumps(out))
    sys.stdout.flush()
    return 1


def solve(data, pywrapcp, routing_enums_pb2) -> int:
    distance_matrix = data["distance_matrix"]
    duration_matrix = data["duration_matrix"]
    time_windows = data["time_windows"]
    service_times = data["service_times"]
    depot_start = int(data["depot_start"])
    depot_end = int(data["depot_end"])
    end_depot_index = int(data.get("end_depot_index", 0))
    customer_count = int(data.get("customer_count", len(distance_matrix) - 1))
    time_limit_seconds = int(data.get("time_limit_seconds", 5))
    violation_penalty = int(data.get("violation_penalty", 10_000))

    n = len(distance_matrix)  # = N+1 nodes (depot + customers)

    # Scale float → integer cho OR-Tools (× 1000 km = mét, × 1 phút = phút)
    SCALE_DISTANCE = 1000  # km → mét
    distance_int = [
        [int(round(distance_matrix[i][j] * SCALE_DISTANCE)) for j in range(n)]
        for i in range(n)
    ]
    duration_int = [
        [int(round(duration_matrix[i][j])) for j in range(n)] for i in range(n)
    ]

    # 1 vehicle, start depot index 0, end depot có thể khác 0.
    manager = pywrapcp.RoutingIndexManager(n, 1, [0], [end_depot_index])
    routing = pywrapcp.RoutingModel(manager)

    # ─── Distance callback (objective) ──────────────────────────────────
    def distance_cb(from_index, to_index):
        i = manager.IndexToNode(from_index)
        j = manager.IndexToNode(to_index)
        return distance_int[i][j]

    distance_idx = routing.RegisterTransitCallback(distance_cb)
    routing.SetArcCostEvaluatorOfAllVehicles(distance_idx)

    # ─── Time callback (= duration + service) ───────────────────────────
    def time_cb(from_index, to_index):
        i = manager.IndexToNode(from_index)
        j = manager.IndexToNode(to_index)
        return duration_int[i][j] + service_times[i]

    time_idx = routing.RegisterTransitCallback(time_cb)

    # Horizon = big-M. KHÔNG dùng depot_end làm trần cứng: nếu chặn cumul ≤ depot_end
    # thì với instance bị ràng buộc chặt sẽ không tồn tại phép gán nào → OR-Tools
    # trả None ("không tìm được nghiệm"). Đặt trần đủ lớn để SOFT upper bound (đếm
    # vi phạm) điều khiển, đồng bộ hành vi với Greedy/2-opt/SA/ACO.
    max_edge = max((max(row) for row in duration_int), default=0)
    max_service = max(service_times, default=0)
    horizon = depot_start + n * (max_edge + max_service) + depot_end + violation_penalty

    # Time dimension — slack & capacity = horizon (cho phép wait & vi phạm mềm)
    routing.AddDimension(
        time_idx,
        horizon,  # max slack (wait time) — không chặn cứng
        horizon,  # capacity = big-M, KHÔNG phải depot_end (sửa lỗi mô hình)
        False,    # don't force start cumul to 0
        "Time",
    )
    time_dim = routing.GetDimensionOrDie("Time")

    # ─── Time window constraints với SOFT upper bound ──────────────────
    # Lý do soft: matching behavior với Greedy/SA — đếm vi phạm, không từ chối.
    for node in range(1, n):  # bỏ qua depot start/end
        if node == end_depot_index:
            continue
        earliest, latest = time_windows[node]
        index = manager.NodeToIndex(node)
        # Hard lower (đến sớm thì wait, OK)
        time_dim.CumulVar(index).SetMin(int(earliest))
        # Soft upper — vượt qua chỉ bị penalty, không infeasible
        time_dim.SetCumulVarSoftUpperBound(
            index, int(latest), violation_penalty * SCALE_DISTANCE
        )

    # Depot ràng buộc: xuất phát đúng giờ
    depot_index = routing.Start(0)
    time_dim.CumulVar(depot_index).SetRange(depot_start, depot_start)
    # Hạn về depot: trần cứng = horizon (big-M), không chặn ở depot_end.
    end_index = routing.End(0)
    time_dim.CumulVar(end_index).SetMax(horizon)
    # Soft upper tại end → về trễ depot_end chỉ bị phạt, không vô nghiệm.
    time_dim.SetCumulVarSoftUpperBound(
        end_index, depot_end, violation_penalty * SCALE_DISTANCE
    )

    # ─── Search parameters ──────────────────────────────────────────────
    search_params = pywrapcp.DefaultRoutingSearchParameters()
    search_params.first_solution_strategy = (
        routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    )
    search_params.local_search_metaheuristic = (
        routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    )
    search_params.time_limit.seconds = time_limit_seconds

    solution = routing.SolveWithParameters(search_params)

    if solution is None:
        return write_error("OR-Tools không tìm được nghiệm trong time limit")

    # ─── Extract solution ───────────────────────────────────────────────
    route = []
    arrival_times = []
    violations = 0
    total_distance = 0.0
    total_duration_min = 0
    index = routing.Start(0)
    prev_node = None

    while not routing.IsEnd(index):
        node = manager.IndexToNode(index)
        if 1 <= node <= customer_count:
            route.append(node - 1)  # đổi lại về customer index (0..N-1)
            arrival = solution.Value(time_dim.CumulVar(index))
            arrival_times.append(arrival)
            earliest, latest = time_windows[node]
            if arrival > latest:
                violations += 1
        if prev_node is not None:
            total_distance += distance_matrix[prev_node][node]
        prev_node = node
        index = solution.Value(routing.NextVar(index))

    # Leg cuối: prev_node -> depot kết thúc
    end_node = manager.IndexToNode(index)
    if prev_node is not None:
        total_distance += distance_matrix[prev_node][end_node]

    # Total duration = time tại depot end - depot start
    end_time = solution.Value(time_dim.CumulVar(routing.End(0)))
    total_duration_min = end_time - depot_start
    if end_time > depot_end:
        violations += 1  # depot return late

    out = {
        "status": "OK",
        "route": route,
        "total_distance": round(total_distance, 2),
        "total_duration": round(float(total_duration_min), 1),
        "arrival_times": [float(t) for t in arrival_times],
        "violations": violations,
        "error_message": None,
    }
    sys.stdout.write(json.dumps(out))
    sys.stdout.flush()
    return 0


if __name__ == "__main__":
    sys.exit(main())
