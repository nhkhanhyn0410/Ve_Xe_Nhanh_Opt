# Phân hệ tối ưu hóa lộ trình trung chuyển

Tài liệu này mô tả phân hệ solver dùng để giải các bài toán tối ưu lộ trình trung chuyển trong dự án `Ve Xe Nhanh`. Phân hệ hỗ trợ TSPTW, VRPTW và MDVRPTW, đồng thời là nền tảng cho các thực nghiệm được trình bày trong `bao_cao.md`.

Phân hệ chạy trong backend NestJS, sinh instance và trả kết quả trực tiếp trong bộ nhớ. Các module solver là stateless và không phụ thuộc MongoDB.

## Nội dung

- [Tổng quan](#tổng-quan)
- [Cấu trúc mã nguồn](#cấu-trúc-mã-nguồn)
- [Cài đặt và chạy thực nghiệm](#cài-đặt-và-chạy-thực-nghiệm)
- [API endpoints](#api-endpoints)
- [Dữ liệu mẫu và seed](#dữ-liệu-mẫu-và-seed)
- [Pseudocode thuật toán](#pseudocode-thuật-toán)

## Tổng quan

| Nhóm bài toán | Module | Mô tả |
| --- | --- | --- |
| TSPTW | `shuttle-optimizer` | Một xe, một depot, có time window cho từng khách |
| VRPTW | `shuttle-multi-hub` | Nhiều xe, một depot, có time window và sức chứa xe |
| MDVRPTW | `shuttle-multi-hub` | Nhiều xe, nhiều depot/hub, có time window và sức chứa xe |

Các solver chính gồm brute force/Held-Karp, greedy, 2-opt, simulated annealing, ant colony optimization (ACO) kết hợp 2-opt và OR-Tools. Kết quả thực nghiệm được lưu thủ công trong thư mục `ket-qua/`.

## Cấu trúc mã nguồn

Mã nguồn nằm trong backend NestJS, gồm hai module độc lập:

```text
apps/backend/src/modules/
├── shuttle-optimizer/                  # TSPTW: 1 xe, 1 depot
│   ├── shuttle-optimizer.controller.ts
│   ├── shuttle-optimizer.service.ts
│   ├── shuttle-optimizer.module.ts
│   ├── solvers/
│   │   ├── solver.interface.ts         # abstract TSPTWSolver
│   │   ├── brute-force.solver.ts       # Held-Karp DP, mốc tham chiếu
│   │   ├── greedy.solver.ts            # nearest-neighbor
│   │   ├── two-opt.solver.ts
│   │   ├── simulated-annealing.solver.ts
│   │   ├── ant-colony.solver.ts        # ACO + 2-opt
│   │   └── or-tools.solver.ts          # gọi or-tools-solver.py qua subprocess
│   ├── benchmark/
│   │   ├── benchmark-runner.ts         # runConfig(), computeGap(), aggregate()
│   │   ├── instance-generator.ts       # sinh instance qua SeededRandom
│   │   ├── aco-tuner.ts                # grid search alpha x beta x rho
│   │   └── seed-data.ts
│   ├── distance/
│   │   └── osrm-distance-matrix.service.ts   # OSRM /table + fallback Haversine
│   ├── models/  (tsptw-instance.ts, tsptw-solution.ts, time-window.ts, seeded-random.ts)
│   └── dto/     (solve-request.dto.ts, solve-response.dto.ts)
└── shuttle-multi-hub/                  # VRPTW / MDVRPTW: nhiều xe, nhiều depot
    ├── shuttle-multi-hub.controller.ts
    ├── shuttle-multi-hub.service.ts
    ├── shuttle-multi-hub.module.ts
    ├── solvers/
    │   ├── solver.interface.ts
    │   ├── aco-two-opt-vrptw.solver.ts
    │   ├── aco-two-opt-mdvrptw.solver.ts
    │   ├── two-opt-vrptw.solver.ts
    │   └── route-evaluator.ts
    ├── benchmark/  (instance-generator.ts, seed-data.ts)
    ├── models/     (vrptw-instance.ts, vrptw-solution.ts, time-window.ts)
    └── dto/        (solve-request.dto.ts, solve-response.dto.ts)
```

Frontend nằm trong `apps/frontend/src/app/` và có ba trang liên quan:

- `shuttle-demo/`: demo TSPTW.
- `shuttle-bench/`: chạy benchmark/tuning.
- `shuttle-multi-hub/`: demo VRPTW và MDVRPTW, có bản đồ trực quan hóa tuyến.

## Cài đặt và chạy thực nghiệm

Quy trình tái lập đầy đủ được mô tả trong `huong_dan.md`. Phần dưới đây là các bước cốt lõi để chạy phân hệ solver.

### Cài đặt

Từ thư mục gốc `Ve_Xe_Nhanh_Ts/`:

```bash
npm install
npm run build:types
cp apps/backend/.env.example apps/backend/.env
```

Trong `apps/backend/.env`, cần đảm bảo backend chạy ở port `5501`:

```env
PORT=5501
```

### Khởi động

Chạy backend NestJS:

```bash
npm run dev:backend
```

Swagger API mở tại `http://localhost:5501/api/docs`.

Chạy frontend Next.js:

```bash
npm run dev:frontend
```

Frontend mở tại `http://localhost:3001`.

### Thành phần tùy chọn

OR-Tools cần Python 3.8+ và package `ortools`:

```bash
pip install ortools
```

Nếu môi trường thiếu `ortools`, chỉ solver `or-tools` trả nghiệm rỗng kèm cảnh báo; các solver còn lại vẫn chạy bình thường.

OSRM là nguồn ma trận khoảng cách chính của báo cáo. Khi OSRM không sẵn sàng hoặc `/table` trả ô `null`, hệ thống có fallback Haversine để phục vụ phát triển. Với số liệu báo cáo, nên chạy lại khi OSRM hoạt động để tránh trộn hai nguồn ma trận.

### Thứ tự thực nghiệm

Nên chạy các thực nghiệm theo thứ tự:

1. TN0: smoke test.
2. TN2: tuning ACO, dùng cho mục 5.3 của báo cáo.
3. TN3: benchmark 6 solver TSPTW, dùng cho mục 5.4.
4. TN4: VRPTW, dùng cho mục 5.5.
5. TN5: MDVRPTW, dùng cho mục 5.6.

TN2 cần chạy trước TN3 vì kết quả tuning chọn bộ tham số `alpha`, `beta`, `rho` để diễn giải benchmark. TN4 và TN5 dùng cùng họ ACO + 2-opt nên chạy sau TN2/TN3.

## API endpoints

API prefix: `/api/v1`.

Toàn bộ response được `TransformInterceptor` bọc theo dạng:

```json
{
  "success": true,
  "data": {}
}
```

### Shuttle Optimizer: TSPTW

| Method | Endpoint | Mục đích |
| --- | --- | --- |
| GET | `/shuttle-optimizer/solvers` | Liệt kê 6 solver |
| GET | `/shuttle-optimizer/demo?solver=` | Giải 10 điểm thật tại TPHCM bằng OSRM, fallback Haversine nếu thiếu OSRM |
| GET | `/shuttle-optimizer/random?n=&radius=&window=&depotEnd=&seed=&solver=` | Sinh instance ngẫu nhiên rồi giải |
| POST | `/shuttle-optimizer/solve` | Giải instance tùy chỉnh |
| POST | `/shuttle-optimizer/tune-aco` | Grid search `alpha x beta x rho` cho TN2 |
| POST | `/shuttle-optimizer/benchmark` | Benchmark 6 solver cho TN3 |

### Shuttle Multi Hub: VRPTW / MDVRPTW

| Method | Endpoint | Mục đích |
| --- | --- | --- |
| GET | `/shuttle-multi-hub/solvers` | Liệt kê solver `aco-2opt-vrptw`, `aco-2opt-mdvrptw` |
| GET | `/shuttle-multi-hub/main-route` | Lấy polyline OSRM tuyến chính Bến Xe Miền Tây - Bến Xe Miền Đông |
| GET | `/shuttle-multi-hub/seed?mode=&solver=` | Giải seed cố định gồm 10 khách, 2 hub |
| GET | `/shuttle-multi-hub/demo?mode=&n=&vehicles=&radius=&window=&depotEnd=&seed=&solver=` | Sinh và giải instance cho TN4/TN5 |
| POST | `/shuttle-multi-hub/solve` | Giải instance tùy chỉnh |

Các endpoint chỉ phục vụ liệt kê solver, gửi instance, chạy benchmark/tuning và truy xuất kết quả. Phân hệ không có endpoint lưu/đọc kết quả từ database.

## Dữ liệu mẫu và seed

Phân hệ có hai nguồn dữ liệu chính:

- Seed cố định trong `benchmark/seed-data.ts`: gồm 10 điểm thật tại TPHCM quanh Bến Xe Miền Đông và Bến Xe Miền Tây. Nguồn này dùng cho endpoint `/demo` và `/seed`, tái lập tuyệt đối và không phụ thuộc tham số sinh ngẫu nhiên.
- Sinh ngẫu nhiên có kiểm soát trong `benchmark/instance-generator.ts`: nhận một `seed` số nguyên, dùng `SeededRandom` để đảm bảo cùng `seed` sẽ tạo cùng một instance.

Mỗi instance sinh ngẫu nhiên có id dạng:

```text
gen-N{n}-r{radius}-w{window}-s{seed}
```

Các tham số mặc định:

| Tham số | Giá trị |
| --- | --- |
| `radiusKm` | `15` |
| `windowWidthMinutes` | `60` |
| `depotStartTime` | `300` tương ứng 05:00 |
| `depotEndTime` | `420` tương ứng 07:00 |
| `serviceTime` | `2` |
| `vehicleCapacity` | `16` |
| Depot mặc định | Bến Xe Miền Đông `[106.815484, 10.880216]` |

Khi sinh instance, khách được đặt trong đĩa bán kính `radiusKm` quanh depot, có time window rộng `windowWidthMinutes`, service time, demand và ràng buộc sức chứa xe.

## Pseudocode thuật toán

Phần này trích xuất pseudocode của các solver chính để đối chiếu với mã nguồn:

- `apps/backend/src/modules/shuttle-optimizer/solvers/ant-colony.solver.ts`
- `apps/backend/src/modules/shuttle-optimizer/solvers/two-opt.solver.ts`
- `apps/backend/src/modules/shuttle-multi-hub/solvers/aco-two-opt-vrptw.solver.ts`
- `apps/backend/src/modules/shuttle-multi-hub/solvers/aco-two-opt-mdvrptw.solver.ts`
- `apps/backend/src/modules/shuttle-multi-hub/solvers/route-evaluator.ts`
- `apps/backend/src/modules/shuttle-multi-hub/solvers/two-opt-vrptw.solver.ts`

### ACO + 2-opt cho TSPTW

TSPTW là trường hợp một xe, một route. Một nghiệm là một hoán vị các khách; sau khi replay route, solver tính tổng quãng đường, giờ đến, số vi phạm cửa sổ thời gian và vi phạm về depot. ACO xếp hạng nghiệm bằng `cost = violationCount * 10_000 + totalDistance`; 2-opt nội bộ dùng thứ tự ưu tiên tương đương: giảm số vi phạm trước, sau đó mới giảm quãng đường.

```text
Input:
  instance  // customers[], distanceMatrix, durationMatrix,
            // depotStartTime, depotEndTime, optional endDepot
  antCount, maxIterations, alpha, beta, evaporationRate,
  pheromoneDeposit, useLocalSearch, twoOptOnTopK, variant, timeLimitMs, seed
Output:
  bestSolution

Constants:
  VIOLATION_PENALTY = 10_000
  EPSILON = 1e-6

solveTsptwAco(instance, config):
    if instance.customers rỗng:
        return emptySolution

    rng       = SeededRandom(seed)
    greedySol = greedySolve(instance)
    bestRoute = clone(greedySol.route)
    bestEval  = evaluateRoute(bestRoute, instance)

    if số khách < 2:
        return toSolution(bestRoute, bestEval)

    endDepotIdx = endDepotMatrixIdx(instance)
    tau0 = 1 / (customerCount * max(1, bestEval.cost))
    tau  = matrix(size = distanceMatrix.length, value = tau0)
    eta  = computeHeuristic(distanceMatrix)

    tauMax = 1 / (evaporationRate * max(1, bestEval.cost))
    tauMin = tauMax / (2 * customerCount)

    for iter = 1 to maxIterations và chưa hết timeLimitMs:
        ants = []

        for ant = 1 to antCount:
            route = constructAntTour(instance, tau, eta, alpha, beta, rng)
            eval  = evaluateRoute(route, instance)
            ants.push({ route, eval })

        sort ants tăng dần theo eval.cost

        if useLocalSearch:
            k = min(twoOptOnTopK, ants.length)
            for i = 0 to k-1:
                refined = twoOptRefineRoute(instance, ants[i].route, timeLimitMs = 500)
                ants[i] = {
                    route: refined.route,
                    eval: evaluateRoute(refined.route, instance),
                }
            sort ants tăng dần theo eval.cost

        if ants[0].eval.cost < bestEval.cost:
            bestRoute = clone(ants[0].route)
            bestEval  = ants[0].eval
            tauMax = 1 / (evaporationRate * max(1, bestEval.cost))
            tauMin = tauMax / (2 * customerCount)

        for mọi i, j:
            tau[i][j] = tau[i][j] * (1 - evaporationRate)

        if variant == "AS":
            for mỗi ant trong ants:
                depositPheromone(
                    tau,
                    ant.route,
                    pheromoneDeposit / max(1, ant.eval.cost),
                    endDepotIdx,
                )
        else:
            depositPheromone(
                tau,
                bestRoute,
                pheromoneDeposit / max(1, bestEval.cost),
                endDepotIdx,
            )
            clamp mọi tau[i][j] vào [tauMin, tauMax]

    return toSolution(bestRoute, bestEval)
```

```text
constructAntTour(instance, tau, eta, alpha, beta, rng):
    visited = [false] * customerCount
    route = []
    currentMatrixIndex = 0

    while còn khách chưa thăm:
        weights = []
        for mỗi customer j chưa thăm:
            matrixIndex = j + 1
            weight[j] = tau[currentMatrixIndex][matrixIndex]^alpha
                        * eta[currentMatrixIndex][matrixIndex]^beta

        if tổng weight <= 0:
            chosen = chọn đều ngẫu nhiên trong nhóm chưa thăm
        else:
            chosen = rouletteWheel(weights, rng)

        route.push(chosen)
        visited[chosen] = true
        currentMatrixIndex = chosen + 1

    return route

evaluateRoute(route, instance):
    distance = 0
    violationCount = 0
    currentTime = instance.depotStartTime
    lastMatrix = 0
    arrivalTimes = []

    for mỗi customerIndex trong route:
        matrixIndex = customerIndex + 1
        travel = durationMatrix[lastMatrix][matrixIndex]
        arrival = currentTime + travel
        arrivalTimes.push(arrival)

        if arrival > customer.timeWindow.latest:
            violationCount += 1

        distance += distanceMatrix[lastMatrix][matrixIndex]
        currentTime = max(arrival, customer.timeWindow.earliest)
                      + customer.serviceTime
        lastMatrix = matrixIndex

    endDepotIdx = endDepotMatrixIdx(instance)
    distance += distanceMatrix[lastMatrix][endDepotIdx]
    depotArrivalTime = currentTime + durationMatrix[lastMatrix][endDepotIdx]

    if depotArrivalTime > instance.depotEndTime:
        violationCount += 1

    cost = violationCount * VIOLATION_PENALTY + distance
    return { distance, violationCount, arrivalTimes, cost }
```

### ACO + 2-opt cho VRPTW

VRPTW mở rộng từ một route sang một tập route, mỗi route gắn với một xe. Trong chế độ VRPTW của hệ thống, các xe cùng xuất phát và kết thúc ở depot duy nhất; vì vậy `startDepotIndex` và `endDepotIndex` đều trỏ về depot 0.

Trong VRPTW một depot, `preferredDepotId` của khách trùng với depot duy nhất nên `preferencePenalty = 0`, còn `depotBias` là hằng số trên mọi lựa chọn và không làm đổi xác suất tương đối. Vì vậy pseudocode VRPTW lược bỏ hai hạng tử này; công thức đầy đủ cho chế độ nhiều depot nằm ở phần MDVRPTW.

```text
Input:
  instance  // mode = "vrptw", depots[], vehicles[], customers[],
            // distanceMatrix, durationMatrix
  antCount, maxIterations, alpha, beta, evaporationRate,
  pheromoneDeposit, useLocalSearch, twoOptTimeLimitMs, timeLimitMs, seed
Output:
  bestSolution

solveVrptwAco(instance, config):
    assert instance.mode == "vrptw"
    if instance.customers rỗng:
        return emptySolution

    rng = SeededRandom(seed)

    greedyPlans = buildGreedyPlans(instance)
    initial = refineOrEvaluate(instance, greedyPlans, useLocalSearch, twoOptTimeLimitMs)

    bestPlans = clone(initial.plans)
    bestEval  = initial.evaluation

    tau0 = 1 / max(1, customerCount * bestEval.cost)
    tau  = matrix(size = distanceMatrix.length, value = tau0)
    eta  = computeHeuristic(distanceMatrix)

    for iter = 1 to maxIterations và chưa hết timeLimitMs:
        ants = []

        for ant = 1 to antCount:
            plans = constructPlan(instance, tau, eta, alpha, beta, rng)
            result = refineOrEvaluate(instance, plans, useLocalSearch, twoOptTimeLimitMs)
            ants.push(result)

        sort ants tăng dần theo evaluation.cost

        if ants[0].evaluation.cost < bestEval.cost:
            bestPlans = clone(ants[0].plans)
            bestEval  = ants[0].evaluation

        for mọi i, j:
            tau[i][j] = max(EPSILON, tau[i][j] * (1 - evaporationRate))

        amount = pheromoneDeposit / max(1, bestEval.cost)
        depositPheromoneOnPlans(tau, bestPlans, instance, amount)

    return evaluatePlan(instance, bestPlans).solution
```

```text
constructPlan(instance, tau, eta, alpha, beta, rng):
    states = []
    for mỗi vehicle trong instance.vehicles:
        states.push({
            vehicle,
            plan: { vehicleId: vehicle.id, customerIndices: [] },
            currentMatrixIndex: vehicle.startDepotIndex,
            currentTime: depots[vehicle.startDepotIndex].timeWindow.earliest,
            load: 0,
        })

    unvisited = { 0, 1, ..., customerCount-1 }

    while unvisited không rỗng:
        choices = candidateChoices(instance, states, unvisited, alpha, beta, tau, eta)
        chosen = rouletteWheel(choices theo weight, rng)
        applyChoice(instance, states[chosen.stateIndex], chosen.customerIndex)
        unvisited.remove(chosen.customerIndex)

    return states.map(state => state.plan)

candidateChoices(instance, states, unvisited, alpha, beta, tau, eta):
    choices = []
    capacityFeasibleExists = tồn tại một cặp (xe, khách) chưa vượt sức chứa

    for mỗi state trong states:
        for mỗi customerIndex trong unvisited:
            customer = instance.customers[customerIndex]
            customerMatrix = customerMatrixIndex(instance, customerIndex)

            capacityOk = state.load + customer.demand <= state.vehicle.capacity
            if capacityFeasibleExists và !capacityOk:
                continue

            travelTime = durationMatrix[state.currentMatrixIndex][customerMatrix]
            arrivalTime = state.currentTime + travelTime
            wait = max(0, customer.timeWindow.earliest - arrivalTime)
            latePenalty = max(0, arrivalTime - customer.timeWindow.latest)

            departureTime = max(arrivalTime, customer.timeWindow.earliest)
                            + customer.serviceTime
            endTravel = durationMatrix[customerMatrix][state.vehicle.endDepotIndex]
            returnLatePenalty = max(
                0,
                departureTime + endTravel - depots[state.vehicle.endDepotIndex].timeWindow.latest,
            )
            overloadPenalty = max(0, state.load + customer.demand - state.vehicle.capacity)

            score = travelTime + wait + latePenalty * 80
                    + returnLatePenalty * 25 + overloadPenalty * 500

            if chưa có tau hoặc eta:
                weight = 1 / max(EPSILON, score)
            else:
                pheromone = tau[state.currentMatrixIndex][customerMatrix]^alpha
                heuristic = eta[state.currentMatrixIndex][customerMatrix]^beta
                timeBias = 1 / (1 + wait + latePenalty * 30 + returnLatePenalty)
                capacityBias = capacityOk ? 1 : 0.03
                weight = max(EPSILON, pheromone * heuristic * timeBias * capacityBias)

            choices.push({ stateIndex, customerIndex, weight, score })

    return choices
```

### ACO + 2-opt cho MDVRPTW

`AcoTwoOptMdvrptwSolver` kế thừa cùng lớp cơ sở với VRPTW và chỉ đặt `expectedMode = "mdvrptw"`. Điểm khác nằm ở dữ liệu: có nhiều depot, mỗi xe có depot đầu/cuối riêng, và mỗi khách có `preferredDepotId` để tạo thiên lệch mềm khi chọn xe phục vụ.

```text
solveMdvrptwAco(instance, config):
    assert instance.mode == "mdvrptw"
    return baseAcoTwoOptSolve(instance, config)

initialStates(instance):
    states = []
    for mỗi vehicle trong instance.vehicles:
        states.push({
            vehicle,
            plan: { vehicleId: vehicle.id, customerIndices: [] },
            currentMatrixIndex: vehicle.startDepotIndex,
            currentTime: depots[vehicle.startDepotIndex].timeWindow.earliest,
            load: 0,
        })
    return states

depositPheromoneOnPlans(tau, plans, instance, amount):
    for mỗi plan trong plans:
        vehicle = vehicleById(plan.vehicleId)
        if plan.customerIndices rỗng:
            continue

        previousMatrix = vehicle.startDepotIndex
        for mỗi customerIndex trong plan.customerIndices:
            currentMatrix = customerMatrixIndex(instance, customerIndex)
            tau[previousMatrix][currentMatrix] += amount
            tau[currentMatrix][previousMatrix] += amount
            previousMatrix = currentMatrix

        tau[previousMatrix][vehicle.endDepotIndex] += amount
        tau[vehicle.endDepotIndex][previousMatrix] += amount
```

```text
candidateChoicesMdvrptw(instance, states, unvisited, alpha, beta, tau, eta):
    choices = []
    capacityFeasibleExists = tồn tại một cặp (xe, khách) chưa vượt sức chứa

    for mỗi state trong states:
        for mỗi customerIndex trong unvisited:
            customer = instance.customers[customerIndex]
            customerMatrix = customerMatrixIndex(instance, customerIndex)

            capacityOk = state.load + customer.demand <= state.vehicle.capacity
            if capacityFeasibleExists và !capacityOk:
                continue

            travelTime = durationMatrix[state.currentMatrixIndex][customerMatrix]
            arrivalTime = state.currentTime + travelTime
            wait = max(0, customer.timeWindow.earliest - arrivalTime)
            latePenalty = max(0, arrivalTime - customer.timeWindow.latest)

            departureTime = max(arrivalTime, customer.timeWindow.earliest)
                            + customer.serviceTime
            endTravel = durationMatrix[customerMatrix][state.vehicle.endDepotIndex]
            returnLatePenalty = max(
                0,
                departureTime + endTravel - depots[state.vehicle.endDepotIndex].timeWindow.latest,
            )
            overloadPenalty = max(0, state.load + customer.demand - state.vehicle.capacity)

            preferencePenalty =
                customer.preferredDepotId tồn tại
                và customer.preferredDepotId != depots[state.vehicle.startDepotIndex].id
                ? 12
                : 0

            score = travelTime + wait + latePenalty * 80
                    + returnLatePenalty * 25
                    + overloadPenalty * 500
                    + preferencePenalty

            if chưa có tau hoặc eta:
                weight = 1 / max(EPSILON, score)
            else:
                pheromone = tau[state.currentMatrixIndex][customerMatrix]^alpha
                heuristic = eta[state.currentMatrixIndex][customerMatrix]^beta
                timeBias = 1 / (1 + wait + latePenalty * 30 + returnLatePenalty)

                depotBias =
                    customer.preferredDepotId == depots[state.vehicle.startDepotIndex].id
                    ? 1.7
                    : customer.preferredDepotId tồn tại ? 0.75 : 1.0

                capacityBias = capacityOk ? 1 : 0.03
                weight = max(EPSILON, pheromone * heuristic * timeBias
                                      * depotBias * capacityBias)

            choices.push({ stateIndex, customerIndex, weight, score })

    return choices
```

`preferredDepotId` chỉ là gợi ý mềm, không phải ràng buộc cứng. Khách vẫn có thể được phục vụ bởi depot khác nếu điều đó giúp giảm trễ giờ, quá tải hoặc quãng đường.

### RouteEvaluator

`RouteEvaluator` là lớp đánh giá chung cho VRPTW và MDVRPTW. Nó replay từng route, cộng vi phạm nội bộ từng xe, sau đó cộng thêm vi phạm phân công nếu khách bị bỏ hoặc bị phục vụ trùng.

```text
Constants:
  VIOLATION_PENALTY = 10_000

evaluatePlan(instance, plans, solverName, runtimeMs):
    seen = map<customerIndex, count>
    routes = []

    for mỗi plan trong plans:
        for mỗi customerIndex trong plan.customerIndices:
            seen[customerIndex] += 1

        vehicle = vehicleById(instance, plan.vehicleId)
        routes.push(evaluateRoute(instance, vehicle, plan))

    unassignedCustomerIds = []
    for customerIndex = 0 to customerCount-1:
        if customerIndex không có trong seen:
            unassignedCustomerIds.push(customers[customerIndex].id)

    duplicateCount = tổng (count - 1) với mọi count > 1 trong seen
    assignmentViolations = unassignedCustomerIds.length + duplicateCount

    routeViolations = tổng route.violationCount
    violationCount = routeViolations + assignmentViolations

    totalDistance = tổng route.totalDistance
    totalDuration = tổng route.totalDuration

    solution = {
        solverName,
        mode: instance.mode,
        routes,
        unassignedCustomerIds,
        totalDistance,
        totalDuration,
        violationCount,
        isFeasible: violationCount == 0,
        runtimeMs,
    }

    cost = violationCount * VIOLATION_PENALTY + totalDistance
    return { solution, cost }
```

```text
evaluateRoute(instance, vehicle, plan):
    startDepot = depots[vehicle.startDepotIndex]
    endDepot   = depots[vehicle.endDepotIndex]

    currentMatrixIndex = vehicle.startDepotIndex
    currentTime = startDepot.timeWindow.earliest
    totalDistance = 0
    load = 0
    violationCount = 0

    arrivalTimes = []
    departureTimes = []
    distanceFromPrev = []

    for mỗi customerIndex trong plan.customerIndices:
        customer = instance.customers[customerIndex]
        matrixIndex = customerMatrixIndex(instance, customerIndex)

        travelTime = durationMatrix[currentMatrixIndex][matrixIndex]
        legDistance = distanceMatrix[currentMatrixIndex][matrixIndex]
        arrivalTime = currentTime + travelTime
        serviceStart = max(arrivalTime, customer.timeWindow.earliest)
        departureTime = serviceStart + customer.serviceTime

        if arrivalTime > customer.timeWindow.latest:
            violationCount += 1

        arrivalTimes.push(arrivalTime)
        departureTimes.push(departureTime)
        distanceFromPrev.push(legDistance)

        totalDistance += legDistance
        load += customer.demand
        currentMatrixIndex = matrixIndex
        currentTime = departureTime

    endTravelTime = durationMatrix[currentMatrixIndex][vehicle.endDepotIndex]
    endDistance = distanceMatrix[currentMatrixIndex][vehicle.endDepotIndex]
    depotArrivalTime = currentTime + endTravelTime
    totalDistance += endDistance

    if depotArrivalTime > endDepot.timeWindow.latest:
        violationCount += 1

    if load > vehicle.capacity:
        violationCount += load - vehicle.capacity

    return {
        vehicleId: vehicle.id,
        vehicleName: vehicle.name,
        startDepotIndex: vehicle.startDepotIndex,
        endDepotIndex: vehicle.endDepotIndex,
        customerIndices: clone(plan.customerIndices),
        arrivalTimes,
        departureTimes,
        distanceFromPrev,
        load,
        totalDistance,
        totalDuration: depotArrivalTime - startDepot.timeWindow.earliest,
        depotArrivalTime,
        violationCount,
        isFeasible: violationCount == 0,
    }
```

Với `cost = violationCount * 10_000 + totalDistance`, một nghiệm có vi phạm luôn bị xếp sau nghiệm không vi phạm trong phạm vi quãng đường của bộ dữ liệu thực nghiệm.

### 2-opt VRPTW refiner

`TwoOptVrptwSolver` nhận một kế hoạch nhiều xe và thử đảo từng đoạn trong từng route. Sau mỗi lần đảo, solver đánh giá lại toàn bộ kế hoạch bằng `RouteEvaluator`. Giá trị mặc định của refiner là `250 ms`; khi được gọi từ ACO nhiều xe, wrapper mặc định truyền `twoOptTimeLimitMs = 180 ms` cho mỗi nghiệm kiến.

```text
refine(instance, initialPlans, solverName, timeLimitMs = 250):
    start = now
    plans = clonePlans(initialPlans)
    best = evaluatePlan(instance, plans, solverName, runtimeMs = 0)
    improved = true

    while improved và (now - start) <= timeLimitMs:
        improved = false

        for routeIndex = 0 to plans.length-1:
            route = plans[routeIndex].customerIndices
            if route.length < 2:
                continue

            for i = 0 to route.length-2:
                for j = i+1 to route.length-1:
                    reverseSegment(route, i, j)
                    candidate = evaluatePlan(instance, plans, solverName, 0)

                    if candidate.cost + EPSILON < best.cost:
                        best = candidate
                        improved = true
                        break

                    reverseSegment(route, i, j)

                if improved hoặc đã hết thời gian:
                    break
            if improved hoặc đã hết thời gian:
                break

    return { plans, evaluation: best }

reverseSegment(route, lo, hi):
    while lo < hi:
        swap(route[lo], route[hi])
        lo += 1
        hi -= 1
```
