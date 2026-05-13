# Shuttle Optimizer — Kế hoạch triển khai

> **Đề tài:** So sánh các thuật toán metaheuristic giải bài toán TSPTW
> (Traveling Salesman Problem with Time Windows) cho xe shuttle đưa đón khách
> trước khi xe khách chính khởi hành.
>
> **Solver chính:** Ant Colony Optimization + 2-Opt local search hybrid (ACO-2opt)
> **Solver baseline:** Greedy Nearest Neighbor, Brute Force (Held-Karp), 2-Opt, Simulated Annealing
> **Solver công nghiệp:** Google OR-Tools (so sánh với industrial-grade)
>
> **Thời lượng:** 4 tuần (~28 ngày)
> **Trạng thái cập nhật:** Tuần 1 — đang gần xong scaffold + UI demo
>
> ---

## 0. Bài toán

### 0.1 Mô tả nghiệp vụ

```
Bến Xe Miền Đông (depot): xe khách chính khởi hành 7:00 sáng.
N khách hàng đặt vé, mỗi khách:
  - có địa chỉ (tọa độ GPS)
  - có thời gian rảnh để được đón (time window [earliest, latest])
  - cần được đón và đưa về depot trước 6:40 (depotEndTime)
1 xe shuttle xuất phát từ depot lúc 5:00 (depotStartTime).
→ Tìm THỨ TỰ đón khách sao cho:
  ✓ Tổng quãng đường nhỏ nhất
  ✓ Mọi khách được đón trong time window
  ✓ Xe về depot trước 6:40
```

### 0.2 Hình thức bài toán toán học

**TSPTW (Traveling Salesman Problem with Time Windows)** — biến thể của TSP cổ điển có ràng buộc time window. NP-hard.

**Input:**
- `N` customer + 1 depot
- Distance matrix `d[i][j]` (km) và Duration matrix `t[i][j]` (phút) — **đã cho trước**
- Time window `[e_i, l_i]` cho mỗi customer
- Service time `s_i` (thời gian đón mất bao lâu tại customer i)
- Depot window `[E, L]` (xuất phát + hạn về)

**Output:** permutation `π = (π_1, π_2, ..., π_N)` của 1..N

**Cost:** `Σ d[π_i][π_{i+1}]` (đường thẳng + leg đầu/cuối từ depot)

**Ràng buộc:**
- `arrival_i ∈ [e_i, l_i]` ∀i (waiting allowed: arrival sớm → chờ đến `e_i`)
- `arrival_depot_return ≤ L`

---

## 1. Tiến độ hiện tại

### 1.1 ✅ ĐÃ HOÀN THÀNH

| Module | File | Trạng thái |
|---|---|---|
| **Models** | `models/time-window.ts` | ✅ Đầy đủ — `isInWindow`, `waitTime`, `isLate` |
| | `models/tsptw-instance.ts` | ✅ Đầy đủ — `TSPTWNode`, `TSPTWInstance` |
| | `models/tsptw-solution.ts` | ✅ Đầy đủ — `TSPTWSolution`, `emptySolution()` |
| **Solver interface** | `solvers/solver.interface.ts` | ✅ Abstract class `TSPTWSolver` + `SolverConfig` |
| **Greedy** | `solvers/greedy.solver.ts` | ✅ **Implement đầy đủ** (Nearest Neighbor + tie-break theo waitTime) |
| **BruteForce** | `solvers/brute-force.solver.ts` | ✅ **Held-Karp DP** + 8 unit tests pass (N ≤ 18) |
| **InstanceGenerator** | `benchmark/instance-generator.ts` | ✅ Mulberry32 PRNG + uniform disk + 11 tests pass |
| **TwoOpt** | `solvers/two-opt.solver.ts` | ✅ Local search, init từ Greedy, lex order (violation, distance) + 9 tests pass |
| **SimulatedAnnealing** | `solvers/simulated-annealing.solver.ts` | ✅ swap+reverse moves, 3 cooling schedules (geometric/linear/log), 11 tests pass |
| **SeededRandom** | `models/seeded-random.ts` | ✅ Mulberry32 PRNG dùng chung cho generator + SA + ACO |
| **OrTools** | `solvers/or-tools.solver.ts` + `or-tools-solver.py` | ✅ Python subprocess + Guided Local Search + soft TW + 6 tests pass |
| **AntColony+2Opt** | `solvers/ant-colony.solver.ts` | ✅ **CORE** — MMAS variant + hybrid với TwoOpt.refineRoute, 11 tests pass |
| **BenchmarkRunner** | `benchmark/benchmark-runner.ts` | ✅ Sweep 6 solver × N × M seed + aggregate metrics + endpoint POST /benchmark, 9 tests pass |
| **AcoTuner** | `benchmark/aco-tuner.ts` | ✅ Grid search α × β × ρ với gap vs reference + endpoint POST /tune-aco, 4 tests pass |
| **Distance** | `distance/osrm-distance-matrix.service.ts` | ✅ Haversine fallback × ROAD_FACTOR 1.35 |
| **DTO** | `dto/solve-request.dto.ts` | ✅ Customer input + optional solver |
| | `dto/solve-response.dto.ts` | ✅ Steps + depot times + routeGeometry |
| **Service** | `shuttle-optimizer.service.ts` | ✅ Facade: solver registry, demo flow, OSRM polyline integration |
| **Controller** | `shuttle-optimizer.controller.ts` | ✅ `GET /solvers`, `GET /demo`, `POST /solve` (`solve` chưa nối DB) |
| **Module** | `shuttle-optimizer.module.ts` | ✅ Registered tất cả solver + service |
| **Seed data** | `benchmark/seed-data.ts` | ✅ DEMO_SEED — 10 khách TPHCM thật, depot Bến Xe Miền Đông |
| **OSRM** | `modules/osrm/osrm.service.ts` | ✅ Method `getRouteGeometry()` đã thêm — trả polyline GeoJSON |
| **Frontend** | `apps/frontend/src/app/shuttle-demo/*` | ✅ Leaflet UI: solver picker, map + marker đánh số, table chi tiết, hiển thị FEASIBLE/INFEASIBLE + lỡ chuyến tag |

### 1.2 🟡 STUB / CHƯA IMPLEMENT

| File | Trạng thái | Tuần |
|---|---|---|
| ~~`solvers/brute-force.solver.ts`~~ | ~~Stub~~ → ✅ Done | ~~W1~~ |
| ~~`solvers/two-opt.solver.ts`~~ | ~~Stub~~ → ✅ Done | ~~W2~~ |
| ~~`solvers/simulated-annealing.solver.ts`~~ | ~~Stub~~ → ✅ Done | ~~W2~~ |
| ~~`solvers/ant-colony.solver.ts`~~ | ~~Stub~~ → ✅ **CORE DONE** | ~~W3~~ |
| ~~`solvers/or-tools.solver.ts`~~ | ~~Stub~~ → ✅ Done (Python subprocess) | ~~W3~~ |
| ~~`benchmark/instance-generator.ts`~~ | ~~Stub~~ → ✅ Done | ~~W1~~ |
| ~~`benchmark/benchmark-runner.ts`~~ | ~~Stub~~ → ✅ Done | ~~W4~~ |
| `shuttle-optimizer.service.ts::buildInstance()` | Throws — chưa nối DB cho `POST /solve` | W4 |

---

## 2. Lộ trình 4 tuần

### Tuần 1 — Scaffold + Baselines (~80% xong)

| Day | Task | Status |
|---|---|---|
| 1 | Module scaffold + models + DTO + interface | ✅ |
| 2-3 | OsrmDistanceMatrixService với Haversine fallback | ✅ |
| 3-4 | **Brute Force (Held-Karp DP)** với time window check | ✅ |
| 5-6 | Greedy Nearest Neighbor solver | ✅ |
| 7 | InstanceGenerator (random N=5..15 trong bán kính TPHCM) | ✅ |
| 7 | Demo seed (10 khách TPHCM thật) + endpoint `/demo` | ✅ |
| — | UI Leaflet + map + table + OSRM polyline | ✅ (extra) |

**Mốc đầu tuần 2:** Brute Force chạy được trên N=8 → có ground truth so sánh với Greedy.

### Tuần 2 — Local Search Methods

| Day | Task | Status |
|---|---|---|
| 8-10 | **2-Opt solver** — đảo cặp cạnh, feasibility check | ✅ |
| 10-13 | **Simulated Annealing** — cooling schedule, reheating | ✅ |
| 13-14 | Unit test cho cả 2 solver, so sánh với greedy + brute-force | ⏳ |

**Mốc cuối tuần 2:** 4/6 solver chạy được. Có số liệu so sánh trên 10 instance random.

### Tuần 3 — Core Algorithm (CHỦ LỰC)

| Day | Task | Status |
|---|---|---|
| 15-17 | **Ant Colony Optimization** — pheromone matrix + ant construction | ✅ |
| 17-19 | **ACO + 2-Opt hybrid** — sau mỗi vòng ACO, 2-opt refine top-K best ants | ✅ |
| 19-20 | Tuning hyperparameter: α, β, ρ, Q, ant count, iterations | ✅ AcoTuner + endpoint |
| 20-21 | **Google OR-Tools** wrapper — Python subprocess + JSON IPC | ✅ |

**Mốc cuối tuần 3:** Solver chính ACO-2opt hoạt động, beat được greedy + 2-opt + SA. So sánh với OR-Tools cho biết gap.

### Tuần 4 — Benchmark + Visualization + Report

| Day | Task | Status |
|---|---|---|
| 22-24 | **BenchmarkRunner** — chạy 6 solver × 30 instance × 5 seed | ✅ |
| 22-24 | Tính metrics: best/avg distance, runtime, optimality gap, success rate | ✅ |
| 24-26 | UI mở rộng: trang `/shuttle-bench` so sánh kết quả các solver | ⏳ |
| 26-27 | Charts: convergence curve cho ACO/SA, bar chart distance, runtime | ⏳ |
| 27-28 | Viết báo cáo + slide trình bày | ⏳ |

---

## 3. Kiến trúc

### 3.1 Sơ đồ luồng dữ liệu

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                       │
│  /shuttle-demo  →  fetch /api/v1/shuttle-optimizer/demo     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│               ShuttleOptimizerController                     │
│  GET /demo, GET /solvers, POST /solve                        │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│               ShuttleOptimizerService (Facade)               │
│  solvers Map → buildInstance → solver.solve → toResponse    │
└──┬──────────────────────────────────────────┬───────────────┘
   │                                          │
   ▼                                          ▼
┌─────────────────────┐              ┌──────────────────────┐
│  Solvers (6 cái)    │              │  Distance Matrix     │
│  - Greedy ✅         │              │  - Haversine ✅       │
│  - BruteForce ⏳     │              │  - OSRM /table ⏳     │
│  - TwoOpt ⏳         │              └──────────────────────┘
│  - SA ⏳             │
│  - ACO ⏳ (CORE)     │              ┌──────────────────────┐
│  - OrTools ⏳        │──────────────│  OsrmService         │
└─────────────────────┘              │  - getRoute ✅        │
                                     │  - getTable ✅        │
   ┌───────────────────┐             │  - getNearest ✅      │
   │  Models           │             │  - getRouteGeometry✅ │
   │  - TSPTWInstance  │             └──────────────────────┘
   │  - TSPTWSolution  │
   │  - TimeWindow     │
   └───────────────────┘
```

### 3.2 Quy ước index trong matrix

```
distanceMatrix[N+1][N+1]:
  index 0   → depot
  index 1..N → customers[0..N-1]

Cẩn thận:
  - solution.route[]  chỉ chứa customer index 0..N-1
  - Khi truy matrix:  matrixIdx = customerIdx + 1
  - Leg đầu:  matrix[0][route[0]+1]
  - Leg giữa: matrix[route[i-1]+1][route[i]+1]
  - Leg cuối: matrix[route[N-1]+1][0]
```

### 3.3 Time tracking

```
Đơn vị:        phút từ 00:00 (300 = 5:00 AM)
depotStart:    300
depotEnd:      400 (6:40, hạn về để khách lên xe khách chính)
travel:        durationMatrix[i][j] (phút, đã ROAD_FACTOR + AVG_SPEED)
service:       2 phút mặc định (đón khách + lên xe)
arrival:       currentTime + travel
wait:          max(0, earliest - arrival)
depart:        max(arrival, earliest) + service
```

---

## 4. Hyperparameter ACO (sẽ tune ở W3)

```typescript
interface ACOConfig {
  ants: number;              // số kiến mỗi vòng — 20..50
  iterations: number;        // số vòng — 100..500
  alpha: number;             // trọng số pheromone — 1.0
  beta: number;              // trọng số heuristic (1/distance) — 2..5
  rho: number;               // tốc độ bay hơi pheromone — 0.1..0.3
  q0: number;                // xác suất exploit (chọn cạnh tốt nhất) — 0.5..0.9
  initialTau: number;        // pheromone ban đầu — 1.0 / (N × greedy_distance)
  twoOptOnTopK: number;      // 2-opt refine top-K best ant mỗi vòng — 3..5
}
```

Default tuned cho N=10..15 — sẽ test thử và tinh chỉnh trên instance random.

---

## 5. Metrics báo cáo (W4)

| Metric | Định nghĩa |
|---|---|
| **Best distance** | Quãng đường ngắn nhất tìm được (min over runs) |
| **Avg distance** | Trung bình quãng đường (× nhiều seed) |
| **Std distance** | Độ ổn định — std càng thấp càng tốt |
| **Runtime ms** | Thời gian solver chạy |
| **Feasibility rate** | % instance giải feasible (no TW violation) |
| **Optimality gap** | `(solver_distance - bruteforce_distance) / bruteforce_distance × 100%` |
|  | Chỉ tính được khi N ≤ 12 (bruteforce kham nổi) |
| **Convergence iter** | ACO/SA — iter mà solution đạt 95% best |

---

## 6. Câu hỏi mở / risk

| # | Vấn đề | Phương án |
|---|---|---|
| 1 | OR-Tools cần Python — có cần Docker hóa? | W3: chỉ cần `python3 + pip install ortools`, không Docker. Document trong README. |
| 2 | Đường thật OSRM đôi khi sai (đường nhỏ chưa map) | Đã có fallback đường thẳng. Acceptable. |
| 3 | ACO không converge với instance khó | W3: tăng iterations + thêm reheat khi stuck |
| 4 | `buildInstance(dto)` chưa làm — cần nối DB Booking | W4: lấy `Trip.id` → query bookings có `transitInfo` → build instance |
| 5 | Time window từ khách thật chưa có | W4: thêm field `preferredPickupTime` vào Booking schema; default ±30 phút |
| 6 | N > 20 thì ACO chậm | Scope đề tài: N=10..15 đủ. Mention scaling là future work. |

---

## 7. Tasks tiếp theo (theo độ ưu tiên)

### Cấp bách (W1 còn lại)

1. ~~**BruteForceSolver**~~ — ✅ Held-Karp DP, 8 test pass
2. ~~**InstanceGenerator**~~ — ✅ Mulberry32 + uniform disk, 11 test pass, controller endpoint `GET /random` với UI radio toggle

### Tuần 2

3. ~~**TwoOptSolver**~~ — ✅ init từ Greedy, lex order (violations, distance), 9 tests pass
4. ~~**SimulatedAnnealingSolver**~~ — ✅ 3 cooling schedules, scalar cost với violation penalty, 11 tests pass

### Tuần 3 (CORE)

5. **AntColonySolver** — pheromone matrix `τ[i][j]`, ant construct probability `p_ij = (τ_ij^α × η_ij^β) / Σ(...)`, update sau mỗi vòng
6. **ACO + 2-opt hybrid** — sau mỗi iteration, lấy top-K ant chạy 2-opt
7. **OrToolsSolver** — Python script đọc instance JSON từ stdin, chạy `pywrapcp.RoutingModel`, output JSON

### Tuần 4

8. **BenchmarkRunner** — config matrix solver × instance × seed, output CSV/JSON
9. **buildInstance(dto)** — nối với Booking + StopPoint trong DB
10. **Frontend `/shuttle-bench`** — trang so sánh: bar chart distance, line chart convergence

---

## 8. Tham chiếu

### Học thuật

- Dorigo & Stützle (2004), *Ant Colony Optimization* — sách giáo khoa ACO
- Kirkpatrick et al. (1983), *Optimization by Simulated Annealing* — SA gốc
- Lin (1965), *Computer Solutions of the Traveling Salesman Problem* — 2-opt
- Held & Karp (1962), *A Dynamic Programming Approach to Sequencing Problems*

### Tools

- [Google OR-Tools VRP guide](https://developers.google.com/optimization/routing/tsp)
- [OSRM HTTP API](https://project-osrm.org/docs/v5.24.0/api/)

### Dataset benchmark

- [Solomon TSPTW instances](https://web.cba.neu.edu/~msolomon/problems.htm) — sẽ thử nếu thừa thời gian W4

---

_Cập nhật lần cuối: tuần 1 — sau khi hoàn thiện UI demo + OSRM polyline integration._
