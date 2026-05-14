# Ve Xe Nhanh

## Mục lục

- [1. Giới thiệu dự án](#1-giới-thiệu-dự-án)
- [2. Mục tiêu hệ thống](#2-mục-tiêu-hệ-thống)
- [3. Phạm vi chức năng](#3-phạm-vi-chức-năng)
- [4. Kiến trúc tổng quan hệ thống](#4-kiến-trúc-tổng-quan-hệ-thống)
- [5. Công nghệ sử dụng](#5-công-nghệ-sử-dụng)
- [6. Quy trình hoạt động tổng quát](#6-quy-trình-hoạt-động-tổng-quát)
- [7. Cấu trúc thư mục chính](#7-cấu-trúc-thư-mục-chính)
- [8. Hướng dẫn cài đặt và chạy project](#8-hướng-dẫn-cài-đặt-và-chạy-project)
- [9. Đối tượng hướng tới và ý nghĩa thực tiễn](#9-đối-tượng-hướng-tới-và-ý-nghĩa-thực-tiễn)
- [10. Hướng phát triển trong tương lai](#10-hướng-phát-triển-trong-tương-lai)

## 1. Giới thiệu dự án

`Ve Xe Nhanh` là hệ thống quản lý và đặt vé xe khách trực tuyến dành cho dịch vụ vận tải hành khách. Hệ thống cho phép khách hàng tìm kiếm chuyến xe, đặt vé và quản lý thông tin hành trình. Đồng thời, hệ thống hỗ trợ quản trị viên và nhân viên nhà xe theo dõi lịch trình, quản lý xe, tuyến và nhân sự.

Dự án giải quyết bài toán vận hành dịch vụ xe khách trong môi trường số: giảm thủ tục thủ công, cải thiện khả năng tìm kiếm và đặt vé, phối hợp giữa các bộ phận điều hành và bán vé.

Đối tượng sử dụng chính:

- Khách hàng/người đi xe
- Quản trị viên hệ thống
- Nhà điều hành, nhân viên/nhà xe và tài xế

## 2. Mục tiêu hệ thống

- Xây dựng hệ thống đặt vé xe khách trực tuyến với giao diện người dùng và quản trị.
- Cung cấp chức năng quản lý chuyến đi, tuyến đường, điểm dừng và xe buýt.
- Hỗ trợ phân quyền giữa khách hàng, quản trị viên và nhân viên.
- Cho phép tìm kiếm và định tuyến bằng OSRM để tối ưu lộ trình.
- Tích hợp tính năng thời gian thực và hàng đợi công việc bằng Redis/Bull.
- Triển khai thuận tiện bằng Docker và monorepo workspace.

## 3. Phạm vi chức năng

### Người dùng / khách hàng

- Đăng ký và đăng nhập.
- Tìm kiếm chuyến đi và tuyến xe.
- Xem chi tiết lộ trình và điểm dừng.
- Đặt vé và quản lý thông tin vé.

### Quản trị viên

- Quản lý người dùng và phân quyền.
- Quản lý danh mục xe, tuyến, điểm dừng và chuyến đi.
- Giám sát hoạt động hệ thống và dữ liệu nghiệp vụ.

### Nhân viên / nhà xe / tài xế

- Quản lý lịch trình chuyến xe.
- Quản lý thông tin nhân sự và nhà xe.
- Hỗ trợ cập nhật trạng thái điều hành.

## 4. Kiến trúc tổng quan hệ thống

Hệ thống được thiết kế theo mô hình frontend/backend tách biệt, chạy trong monorepo với các thành phần chính:

- Frontend: Ứng dụng Next.js + React hiển thị giao diện người dùng và quản trị.
- Backend: API NestJS xử lý nghiệp vụ, xác thực, truy vấn dữ liệu và giao tiếp thời gian thực.
- Database: MongoDB lưu trữ dữ liệu người dùng, vé, chuyến đi, tuyến và cấu hình.
- API: REST API do backend cung cấp cho frontend và các client khác.
- Dịch vụ ngoài: OSRM để định tuyến bản đồ, Redis để cache/queue và Mongo Express cho quản trị MongoDB.

## 5. Công nghệ sử dụng

- Ngôn ngữ: `TypeScript`
- Frontend: `Next.js`, `React`, `Ant Design`, `Zustand`, `React Query`
- Backend: `NestJS`, `Mongoose`, `Passport`, `JWT`, `Bull`, `Socket.IO`
- Cơ sở dữ liệu: `MongoDB`
- Cache/hàng đợi: `Redis`
- Định tuyến bản đồ: `OSRM`
- Công cụ phát triển: `ESLint`, `Prettier`, `Jest`, `Docker Compose`

## 6. Quy trình hoạt động tổng quát

1. Khách hàng truy cập frontend và tìm kiếm chuyến xe.
2. Frontend gọi API backend để lấy danh sách chuyến đi và tuyến.
3. Backend truy vấn MongoDB, đồng thời có thể sử dụng OSRM để xác định lộ trình di chuyển.
4. Khách hàng chọn chuyến và đặt vé qua giao diện.
5. Backend ghi dữ liệu vé vào MongoDB và xử lý các nghiệp vụ liên quan.
6. Quản trị viên/nhân viên truy cập giao diện quản trị để cập nhật chuyến đi, xe và nhân sự.
7. Hệ thống sử dụng Redis/Bull cho các tác vụ nền và giao tiếp thời gian thực nếu cần.

## 7. Cấu trúc thư mục chính

- `/apps/backend`: mã nguồn backend NestJS.
  - `src/common/`: bộ helpers, guards, pipes, interceptors, DTO.
  - `src/config/`: cấu hình môi trường và hệ thống.
  - `src/database/`: khởi tạo kết nối MongoDB và seed dữ liệu.
  - `src/modules/`: các module nghiệp vụ (auth, bookings, buses, trips, users, search, ...).
  - `src/main.ts`: điểm vào của ứng dụng backend.
- `/apps/frontend`: mã nguồn frontend Next.js.
  - `src/app/`: phần giao diện chính.
- `/packages/shared-types`: thư viện chia sẻ kiểu TypeScript giữa frontend và backend.
- `/docker`: cấu hình môi trường Docker, gồm MongoDB, Redis, OSRM và Mongo Express.

## 8. Hướng dẫn cài đặt và chạy project

### 8.1 Cài đặt môi trường local

```bash
git clone <repository-url>
cd Ve_Xe_Nhanh_NestJS_TS
npm install
```

### 8.2 Cấu hình môi trường

- Dự án sử dụng cấu hình môi trường trong backend; kiểm tra file `.env` nếu có trong `apps/backend` để thiết lập thông số MongoDB, JWT, Redis.
- Docker Compose đã cấu hình MongoDB và Redis sẵn trong `docker/docker-compose.yml`.

### 8.3 Chạy project

```bash
npm run dev
```

### 8.4 Chạy riêng từng phần

```bash
npm run dev:backend
npm run dev:frontend
```

### 8.5 Chạy bằng Docker

```bash
npm run docker:dev
```

Lệnh này build và chạy toàn bộ stack:

- Frontend: http://localhost:3000
- Backend API: http://localhost:5501/api/v1
- Swagger: http://localhost:5501/api/docs
- Mongo Express: http://localhost:8082

Các lệnh Docker thường dùng:

```bash
npm run docker:build
npm run docker:logs
npm run docker:down
```

## 9. Đối tượng hướng tới và ý nghĩa thực tiễn

Hệ thống phục vụ:

- Khách hàng cần đặt vé xe khách nhanh chóng và dễ dàng.
- Quản trị viên và nhà điều hành cần quản lý tuyến, chuyến đi, điểm dừng và nhân sự.
- Nhà xe cần một giải pháp số hoá vận hành và cập nhật trạng thái chuyến đi.

Ý nghĩa thực tiễn:

- Giảm thiểu thủ tục giấy tờ khi bán vé.
- Cải thiện tốc độ tìm kiếm và đặt vé cho khách.
- Tăng khả năng quản lý và giám sát hoạt động vận tải.

## 10. Hướng phát triển trong tương lai

- Thêm tính năng thanh toán trực tuyến.
- Xây dựng hệ thống thông báo SMS/Email cho vé và lịch trình.
- Mở rộng phân quyền chi tiết cho tài xế và điều hành tuyến.
- Thêm chức năng đánh giá, nhận xét và phản hồi khách hàng.
- Cải thiện tìm kiếm geo-location, bản đồ và trải nghiệm đặt vé mobile.
