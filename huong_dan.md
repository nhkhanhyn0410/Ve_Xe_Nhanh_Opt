# HƯỚNG DẪN CHẠY THỰC NGHIỆM CHO BÁO CÁO

Tài liệu này mô tả **đường dẫn**, **thứ tự chạy** và **các bước thao tác** để tái lập toàn bộ thực nghiệm trong `bao_cao.md`. Mỗi thực nghiệm được ánh xạ trực tiếp tới một mục của báo cáo (Chương 5) để khi viết/đối chiếu số liệu không bị lệch.

> Quy ước: tất cả lệnh chạy từ thư mục gốc của codebase mới:
> `E:\Bus_Go_rebuild\Ve_Xe_Nhanh_Ts`
> (Codebase JS cũ `E:\Bus_Go_rebuild\Ve_Xe_Nhanh` chỉ để tham khảo logic, KHÔNG chạy thực nghiệm ở đó.)

---

## 0. Bản đồ thực nghiệm ↔ mục báo cáo

| Thực nghiệm | Công cụ chạy | Mục báo cáo |
|---|---|---|
| TN0 — Smoke test solver | `GET /shuttle-optimizer/demo` | 4.7, 4.8 (kiểm chứng hệ thống chạy được) |
| TN1 — Thiết kế instance | `InstanceGenerator` (tham số mặc định) | 5.2 |
| TN2 — Tuning hyperparameter ACO+2-opt | `POST /shuttle-optimizer/tune-aco` | **5.3** |
| TN3 — Benchmark chính TSPTW (6 solver) | UI `/shuttle-bench` hoặc `POST /shuttle-optimizer/benchmark` | **5.4**, 5.7, 5.8 |
| TN4 — VRPTW tùy chỉnh | UI `/shuttle-multi-hub` (mode = `vrptw`) | **5.5** |
| TN5 — MDVRPTW mở rộng | UI `/shuttle-multi-hub` (mode = `mdvrptw`) | **5.6** |

Thứ tự chạy bắt buộc: **TN0 → TN2 → TN3 → TN4 → TN5**. Lý do: TN2 chọn ra bộ tham số (α, β, ρ) tốt nhất; bộ này là căn cứ để diễn giải benchmark chính TN3. TN4/TN5 dùng lại cùng họ thuật toán ACO+2-opt nên chạy sau cùng.

---

## 1. Yêu cầu môi trường

| Thành phần | Bắt buộc | Ghi chú |
|---|---|---|
| Node.js 20+ và npm | Có | Chạy backend (NestJS) + frontend (Next.js) |
| Docker Desktop | Có | MongoDB 7, Redis 7, Mongo Express |
| Python 3.8+ và `pip install ortools` | Tùy chọn | CHỈ cần cho solver `or-tools`. Thiếu → solver này trả nghiệm rỗng + cảnh báo log, các solver khác vẫn chạy bình thường |
| OSRM (Docker) | Tùy chọn | Nếu không có → tự fallback sang Haversine. Số liệu benchmark vẫn hợp lệ (chỉ là khoảng cách đường chim bay thay vì đường bộ) |

---

## 2. Cài đặt (chạy 1 lần)

```bash
cd E:/Bus_Go_rebuild/Ve_Xe_Nhanh_Ts

# 2.1 Cài dependencies toàn monorepo
npm install

# 2.2 Build shared-types TRƯỚC (backend/frontend phụ thuộc package này)
npm run build:types

# 2.3 Tạo file biến môi trường backend
#     Copy apps/backend/.env.example -> apps/backend/.env rồi điền giá trị.
#     Quan trọng: PORT=5501, MONGODB_URI, REDIS_HOST/PORT,
#     JWT_SECRET (>= 32 ký tự), OSRM_URL (mặc định http://localhost:5000)
```

(Tùy chọn) Cài OR-Tools cho solver baseline:

```bash
python -m pip install ortools
```

---

## 3. Khởi động hệ thống (mỗi phiên thực nghiệm)

Mở 3 cửa sổ terminal, đều ở `E:/Bus_Go_rebuild/Ve_Xe_Nhanh_Ts`:

```bash
# Terminal 1 — Hạ tầng (MongoDB + Redis + Mongo Express)
npm run docker:dev

# Terminal 2 — Backend NestJS  (cổng 5501)
npm run dev:backend

# Terminal 3 — Frontend Next.js (cổng 3001)
npm run dev:frontend -- --port 3001
```

> Frontend đã được cấu hình sẵn trong `.claude/launch.json` để chạy ở cổng **3001**. Nếu chạy thủ công, luôn ép cổng 3001 như lệnh trên để các đường link UI bên dưới khớp.

> Có thể thay Terminal 2 + 3 bằng một lệnh `npm run dev` (chạy đồng thời backend + frontend), nhưng tách riêng dễ đọc log hơn khi benchmark.

### 3.1 Kiểm tra hệ thống sẵn sàng (TN0 — smoke test)

| Kiểm tra | Đường dẫn | Kỳ vọng |
|---|---|---|
| Swagger backend | http://localhost:5501/api/docs | Mở được trang Swagger, thấy nhóm **Shuttle Optimizer** + **Shuttle Multi Hub** |
| Danh sách solver TSPTW | http://localhost:5501/api/v1/shuttle-optimizer/solvers | Trả 6 tên: `brute-force`, `greedy-nearest-neighbor`, `two-opt`, `simulated-annealing`, `aco-2opt-hybrid`, `or-tools` |
| Demo 1 solver | http://localhost:5501/api/v1/shuttle-optimizer/demo?solver=aco-2opt-hybrid | JSON có `totalDistance`, `isFeasible`, `steps[]` |
| UI benchmark | http://localhost:3001/shuttle-bench | Trang "Shuttle Bench — So sánh 6 solver TSPTW" hiển thị form cấu hình |
| UI multi-hub | http://localhost:3001/shuttle-multi-hub | Bản đồ + bảng route hiển thị (mặc định MDVRPTW seed cố định) |

> 📸 **Ảnh chụp cần lấy (cho Phụ lục / Chương 4.8):**
> - `screenshot-swagger.png`: trang Swagger `/api/docs` (chứng minh API tồn tại).
> - `screenshot-ui-bench-empty.png`: trang `/shuttle-bench` lúc chưa chạy (form cấu hình).
> - `screenshot-ui-multihub-default.png`: trang `/shuttle-multi-hub` với seed mặc định.

---

## 4. TN1 — Thiết kế instance thực nghiệm (mục báo cáo 5.2)

Không cần thao tác riêng — instance được sinh tự động bởi `InstanceGenerator`. Ghi lại các tham số mặc định sau vào báo cáo (đây là cấu hình thực tế trong mã nguồn):

**Instance TSPTW** (`apps/backend/src/modules/shuttle-optimizer/benchmark/instance-generator.ts`):

| Tham số | Giá trị mặc định | Ý nghĩa |
|---|---|---|
| Depot | `[106.815484, 10.880216]` — Bến Xe Miền Đông, TPHCM | Điểm xuất phát/kết thúc |
| `radiusKm` | 15 | Bán kính phân bố khách quanh depot |
| `windowWidthMinutes` | 60 | Độ rộng trung bình Time Window |
| `depotStartTime` | 300 (05:00) | Giờ shuttle xuất phát |
| `depotEndTime` | 420 (07:00) | Hạn về depot |
| `serviceTime` | 2 phút/khách | Thời gian phục vụ |
| `vehicleCapacity` | 16 | Sức chứa shuttle |
| Phân bố điểm | `r = R·√U, θ = 2πV` | Đều theo diện tích (không tụ tâm) |
| Mã instance | `gen-N{n}-r{r}-w{w}-s{seed}` | Cùng seed → cùng instance (tái lập) |

**Instance VRPTW/MDVRPTW** (`apps/backend/src/modules/shuttle-multi-hub/benchmark/instance-generator.ts`):

| Tham số | Mặc định | Ghi chú |
|---|---|---|
| `customerCount` | 14 | Nửa cụm Tây (quanh BXMT), nửa cụm Đông (quanh BXMĐ) |
| `vehicleCount` | 2 | MDVRPTW: mỗi xe gán 1 depot luân phiên |
| `radiusKm` | 7 | Bán kính cụm |
| `windowWidthMinutes` | 55 | |
| `depotStartTime / depotEndTime` | 300 / 430 | 05:00 → 07:10 |
| `seed` | 42 | |
| Hub Tây (BXMT) | `[106.6232, 10.7411]` | |
| Hub Đông (BXMĐ) | `[106.815484, 10.880216]` | |
| `vehicleCapacity` | `ceil(N / V) + 1` | Tự suy ra nếu không truyền |

---

## 5. TN2 — Tuning hyperparameter ACO + 2-opt (mục báo cáo **5.3**)

Đây là thực nghiệm quan trọng nhất của báo cáo (chứng minh bộ tham số dùng ở benchmark chính là tối ưu, không phải đặt tùy tiện).

### 5.1 Cách chạy (qua Swagger hoặc curl)

Endpoint: `POST http://localhost:5501/api/v1/shuttle-optimizer/tune-aco`

Body rỗng `{}` → dùng grid mặc định:

```bash
curl -X POST http://localhost:5501/api/v1/shuttle-optimizer/tune-aco \
  -H "Content-Type: application/json" -d "{}"
```

Hoặc tùy chỉnh:

```json
{
  "customerCount": 10,
  "seeds": [1, 2, 3, 4, 5],
  "alphas": [0.5, 1.0, 2.0],
  "betas": [2, 3, 5],
  "rhos": [0.1, 0.2],
  "acoIterations": 50,
  "timeLimitPerRun": 3000,
  "maxBruteForceN": 12
}
```

### 5.2 Tham số grid mặc định (ghi vào báo cáo)

| Tham số | Giá trị | Ghi chú |
|---|---|---|
| `customerCount` | 10 | 1 size cố định để tune nhanh |
| `seeds` | [1, 2, 3, 4, 5] | 5 seed → trung bình thống kê |
| `alphas` (α — pheromone) | [0.5, 1.0, 2.0] | |
| `betas` (β — heuristic) | [2, 3, 5] | |
| `rhos` (ρ — bay hơi) | [0.1, 0.2] | |
| Số cấu hình | 3 × 3 × 2 = **18** | |
| Tổng số run ACO | 18 × 5 = **90** | Có thể mất vài phút |
| Solver tham chiếu | Brute-Force (vì N=10 ≤ 12) | Dùng tính `optimalityGap` |
| Tiêu chí sắp xếp | `avgGap` tăng dần, rồi `avgDistance` | `results[0]` = cấu hình tốt nhất |

### 5.3 Kết quả thu được

Response trả về: `results[]` (mỗi phần tử: α, β, ρ, `avgDistance`, `stdDistance`, `avgGap`, `feasibilityRate`, `avgRuntimeMs`), `bestConfig`, `referenceSolverName`, `totalRuns`, `totalRuntimeMs`.

> 📸 **Cần lưu lại (cho mục 5.3):**
> - Lưu nguyên JSON response vào `ket-qua/tn2-tune-aco.json`.
> - Từ JSON này dựng **bảng top cấu hình** (sắp theo `avgGap`) và **heatmap α × β** (ở ρ tốt nhất). Báo cáo mục 5.3 yêu cầu đúng 2 thứ này.
> - Nếu chạy qua Swagger: chụp `screenshot-tn2-tune-response.png` (phần `bestConfig` + 3 dòng đầu `results`).

---

## 6. TN3 — Benchmark chính TSPTW, 6 solver (mục báo cáo **5.4**, 5.7, 5.8)

### 6.1 Cách chạy bằng UI (khuyến nghị — có sẵn bảng + biểu đồ)

1. Mở http://localhost:3001/shuttle-bench
2. Mở khối "📖 Hướng dẫn dùng & diễn giải metrics" để đọc cách hiểu cột.
3. Cấu hình (mặc định UI: sizes = [5, 8, 10], seeds = [1, 2, 3], cả 6 solver, time limit 3000ms, Max N BruteForce = 12).
4. **Cấu hình khuyến nghị cho báo cáo** (khớp default backend, mạnh hơn):
   - Sizes: `5, 8, 10, 12`
   - Seeds: `1, 2, 3, 4, 5`
   - Solvers: tick đủ 6
   - Time limit: `3000` ms
   - Max N BruteForce: `12`
   - → góc phải hiện tổng số run = 4 × 5 × 6 = **120 runs**
5. Bấm **"Chạy benchmark"**, đợi tới khi thanh tiến trình đạt 100%.

### 6.2 Cách chạy bằng API (nếu cần JSON thô để dựng bảng phụ lục)

```bash
curl -X POST http://localhost:5501/api/v1/shuttle-optimizer/benchmark \
  -H "Content-Type: application/json" \
  -d '{"sizes":[5,8,10,12],"seeds":[1,2,3,4,5],"solverConfig":{"timeLimitMs":3000},"maxBruteForceN":12}'
```

Mặc định backend (body `{}`): sizes = [5, 8, 10, 12], seeds = [1..5], cả 6 solver, `maxBruteForceN` = 12.

### 6.3 6 solver được so sánh

| Tên solver (API) | Nhãn UI | Vai trò |
|---|---|---|
| `brute-force` | Brute Force | Held-Karp DP — nghiệm chuẩn (N ≤ 12) |
| `greedy-nearest-neighbor` | Greedy (NN) | Baseline nhanh |
| `two-opt` | 2-Opt | Local search |
| `simulated-annealing` | Simulated Annealing | Metaheuristic |
| `aco-2opt-hybrid` | ACO + 2-Opt ★ | **Thuật toán trọng tâm** |
| `or-tools` | OR-Tools | Baseline công nghiệp |

Reference để tính optimality gap: tự chọn theo N — `brute-force` khi N ≤ 12, ngược lại `or-tools`.

### 6.4 Kết quả thu được

UI hiển thị 3 khối: **Tổng quan**, **Bảng aggregate** (mỗi dòng = 1 solver tại 1 size N: Best/Mean/Std km, Gap %, Feasibility, Viol. avg, Runtime avg), **So sánh trực quan theo từng N**.

> 📸 **Cần chụp (cho mục 5.4, 5.7, 5.8):**
> - `screenshot-tn3-summary.png`: khối "Tổng quan" (tổng runs, wall-clock, reference theo size).
> - `screenshot-tn3-aggregate-table.png`: **toàn bộ bảng aggregate** (số liệu chính của mục 5.4).
> - `screenshot-tn3-comparison.png`: khối "So sánh trực quan theo từng N" (thanh bar).
> - (Tùy chọn) Lưu JSON `POST /benchmark` vào `ket-qua/tn3-benchmark.json` để dựng biểu đồ runtime-vs-N (mục 5.4) và bảng chi tiết từng seed (Phụ lục E).

---

## 7. TN4 — VRPTW tùy chỉnh (mục báo cáo **5.5**)

### 7.1 Cách chạy bằng UI

1. Mở http://localhost:3001/shuttle-multi-hub
2. **Mô hình**: chọn **"VRPTW thuần"**.
3. **Nguồn data**:
   - "Seed cố định (10 khách TPHCM)" → instance tái lập, dùng để chụp ảnh chuẩn.
   - "Random instance" → hiện thêm form: Khách / Xe / Bán kính / Window / Hạn depot / Seed. Chỉnh rồi bấm **"Chạy solver"**.
4. **Các kịch bản cần chạy cho báo cáo** (đổi Time Window từ lỏng → chặt để bộc lộ khả năng xử lý ràng buộc):

| Kịch bản | Khách | Xe | Bán kính | Window | Hạn depot | Seed |
|---|---|---|---|---|---|---|
| VRPTW-lỏng | 14 | 2 | 7 | 90 | 450 | 42 |
| VRPTW-vừa | 14 | 2 | 7 | 55 | 430 | 42 |
| VRPTW-chặt | 14 | 3 | 7 | 35 | 420 | 42 |

Solver mặc định: `aco-2opt-vrptw`.

### 7.2 Kết quả thu được

Bản đồ tuyến + thẻ "Kết quả" (Tổng quãng, Runtime, Tổng thời gian, Vi phạm, FEASIBLE/INFEASIBLE) + bảng "Route theo xe" (mở rộng từng xe xem thứ tự đón, giờ đến, TW yêu cầu, đến trễ ⚠).

> 📸 **Cần chụp cho mỗi kịch bản (mục 5.5):**
> - `screenshot-tn4-{kịch bản}-map.png`: bản đồ route các xe.
> - `screenshot-tn4-{kịch bản}-result.png`: thẻ "Kết quả" + bảng "Route theo xe".
> - Ghi lại vào bảng so sánh: tổng quãng đường, số xe dùng, số vi phạm TW, FEASIBLE? cho 3 kịch bản → đây là bảng chính của mục 5.5.

---

## 8. TN5 — MDVRPTW mở rộng (mục báo cáo **5.6**)

### 8.1 Cách chạy bằng UI

1. Mở http://localhost:3001/shuttle-multi-hub
2. **Mô hình**: chọn **"MDVRPTW"** (mặc định — 2 depot: BXMT + BXMĐ).
3. Chạy 2 kịch bản:

| Kịch bản | Nguồn | Mô tả |
|---|---|---|
| MD-cụm rõ | Seed cố định | 2 cụm tách biệt quanh 2 hub → kiểm tra gán depot gần nhất |
| MD-xen kẽ | Random, bán kính lớn (vd 18), seed bất kỳ | Khách nằm giữa 2 depot → bộc lộ điểm yếu gán theo khoảng cách |

Solver mặc định: `aco-2opt-mdvrptw`.

### 8.2 Kết quả thu được & điểm cần đánh giá

Quan sát: tổng quãng đường, **mức cân bằng tải giữa 2 depot** (số khách mỗi xe ở bảng "Route theo xe"), số vi phạm TW, có khách `unassigned` không.

> 📸 **Cần chụp (mục 5.6):**
> - `screenshot-tn5-cluster-map.png` + bảng route (kịch bản cụm rõ).
> - `screenshot-tn5-mixed-map.png` + bảng route (kịch bản xen kẽ — chỉ rõ mất cân bằng nếu có).
> - Ghi bảng: mỗi depot/xe phục vụ bao nhiêu khách, tổng quãng, vi phạm → minh chứng cho nhận định "gán depot theo khoảng cách chưa tối ưu khi điểm nằm giữa".

---

## 9. Tham chiếu API (cho Phụ lục C của báo cáo)

API prefix: `/api/v1` · Swagger: http://localhost:5501/api/docs

**Module Shuttle Optimizer (TSPTW):**

| Method | Endpoint | Mục đích |
|---|---|---|
| GET | `/shuttle-optimizer/solvers` | Liệt kê 6 solver |
| GET | `/shuttle-optimizer/demo?solver=` | Giải 10 điểm thật TPHCM (Haversine, không cần DB/auth) |
| GET | `/shuttle-optimizer/random?n=&radius=&window=&depotEnd=&seed=&solver=` | Sinh instance ngẫu nhiên rồi giải |
| POST | `/shuttle-optimizer/solve` | Giải instance tùy chỉnh (body có `customers[]`, `depot`, ...) |
| POST | `/shuttle-optimizer/tune-aco` | **Grid search α×β×ρ** (TN2 / mục 5.3) |
| POST | `/shuttle-optimizer/benchmark` | **Benchmark 6 solver** (TN3 / mục 5.4) |

**Module Shuttle Multi Hub (VRPTW / MDVRPTW):**

| Method | Endpoint | Mục đích |
|---|---|---|
| GET | `/shuttle-multi-hub/solvers` | Liệt kê solver `aco-2opt-vrptw`, `aco-2opt-mdvrptw` |
| GET | `/shuttle-multi-hub/main-route` | Polyline OSRM tuyến chính BXMT ↔ BXMĐ |
| GET | `/shuttle-multi-hub/seed?mode=&solver=` | Giải seed cố định (10 khách, 2 hub) |
| GET | `/shuttle-multi-hub/demo?mode=&n=&vehicles=&radius=&window=&depotEnd=&seed=&solver=` | Sinh + giải instance (TN4/TN5) |
| POST | `/shuttle-multi-hub/solve` | Giải instance tùy chỉnh |

---

## 10. Tham số thuật toán ACO + 2-opt (mặc định trong mã nguồn)

Ghi vào báo cáo (mục 5.3, 5.7) — đây là giá trị thực tế khi KHÔNG override:

**ACO+2-opt cho TSPTW** (`solvers/ant-colony.solver.ts`, tên `aco-2opt-hybrid`):

| Tham số | Mặc định |
|---|---|
| `antCount` | `max(10, N)` |
| `maxIterations` | 100 |
| `alpha` (α) | 1.0 |
| `beta` (β) | 3.0 |
| `evaporationRate` (ρ) | 0.1 |
| `pheromoneDeposit` | 100 |
| Biến thể | MMAS (có τ_min / τ_max) |
| 2-opt refine | top-K = 3 nghiệm tốt nhất |
| Penalty vi phạm TW | 10000 (cost = vi_phạm × 10000 + distance) |
| Time limit mặc định | 10000 ms |

**ACO+2-opt cho VRPTW/MDVRPTW** (`shuttle-multi-hub/solvers/aco-two-opt-vrptw.solver.ts`):

| Tham số | Mặc định |
|---|---|
| `antCount` | `max(12, N)` |
| `maxIterations` | 80 |
| `alpha` / `beta` | 1.0 / 3.0 |
| `evaporationRate` | 0.12 |
| `pheromoneDeposit` | 100 |
| 2-opt time limit/route | 180 ms |
| Time limit mặc định | 8000 ms |
| Trọng số phạt | trễ TW ×80, trễ về depot ×25, quá tải ×500, lệch depot ưu tiên = 12 |

---

## 11. Xử lý sự cố thường gặp

| Triệu chứng | Nguyên nhân | Cách xử lý |
|---|---|---|
| UI báo "Không gọi được API" | Backend chưa chạy / sai cổng | Kiểm tra Terminal 2, mở http://localhost:5501/api/docs |
| Solver `or-tools` trả nghiệm rỗng | Chưa cài Python/ortools | `pip install ortools`, hoặc bỏ tick OR-Tools — các solver khác vẫn chạy |
| Benchmark rất lâu / treo | N lớn + BruteForce | Đặt "Max N BruteForce" = 12, giảm sizes/seeds, hoặc giảm time limit |
| Khoảng cách khác kỳ vọng | OSRM không chạy → fallback Haversine | Chấp nhận được cho báo cáo; nếu cần đường bộ thật, bật OSRM rồi chạy lại |
| Frontend mở ở cổng 3000 | Không ép `--port 3001` | Dừng tiến trình, chạy lại đúng lệnh ở mục 3 |
| Số liệu lệch giữa 2 lần chạy | Seed khác / metaheuristic ngẫu nhiên | Cố định `seeds` như trong hướng dẫn; báo cáo dùng trung bình nhiều seed |

---

## 12. Danh mục sản phẩm cần nộp kèm báo cáo

```
ket-qua/
├── tn2-tune-aco.json              # JSON tuning (mục 5.3)
├── tn3-benchmark.json             # JSON benchmark TSPTW (mục 5.4 + Phụ lục E)
└── screenshots/
    ├── screenshot-swagger.png
    ├── screenshot-ui-bench-empty.png
    ├── screenshot-ui-multihub-default.png
    ├── screenshot-tn2-tune-response.png
    ├── screenshot-tn3-summary.png
    ├── screenshot-tn3-aggregate-table.png
    ├── screenshot-tn3-comparison.png
    ├── screenshot-tn4-vrptw-{long,vua,chat}-{map,result}.png
    └── screenshot-tn5-{cluster,mixed}-{map,route}.png
```

Mỗi bảng/biểu đồ trong `bao_cao.md` phải truy nguyên được về một file ở trên — không đưa số liệu không có nguồn vào báo cáo.
