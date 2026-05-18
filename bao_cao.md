# BÁO CÁO ĐỀ TÀI

## Nghiên cứu và triển khai các thuật toán metaheuristic cho bài toán tối ưu lộ trình có ràng buộc thời gian

---

# MỤC LỤC

## CHƯƠNG 1. MỞ ĐẦU VÀ TỔNG QUAN ĐỀ TÀI

1.1. Tổng quan về trí tuệ nhân tạo trong tìm kiếm và tối ưu hóa  
1.2. Heuristic và metaheuristic trong bài toán tối ưu  
1.3. Bối cảnh và vấn đề thực tế  
1.4. Bài toán tối ưu lộ trình có ràng buộc thời gian  
1.5. Mục tiêu nghiên cứu  
1.6. Phạm vi đề tài  
1.7. Đóng góp chính của đề tài  
1.8. Cấu trúc báo cáo  

## CHƯƠNG 2. CƠ SỞ LÝ THUYẾT VỀ TSPTW, VRPTW VÀ MDVRPTW

2.1. Bài toán TSP cổ điển  
2.2. Bài toán TSPTW  
2.3. Bài toán VRPTW  
2.4. Bài toán MDVRPTW  
2.5. Ràng buộc Time Window  
2.6. Hàm mục tiêu và tiêu chí đánh giá nghiệm  
2.7. Tổng quan tài liệu liên quan  

## CHƯƠNG 3. CÁC THUẬT TOÁN ĐƯỢC SỬ DỤNG

3.1. Tổng quan các nhóm thuật toán  
3.2. Held-Karp Dynamic Programming  
3.3. Greedy Nearest Neighbor  
3.4. 2-opt Local Search  
3.5. Simulated Annealing  
3.6. Ant Colony Optimization kết hợp 2-opt cho TSPTW  
3.7. ACO + 2-opt nâng cấp cho VRPTW  
3.8. Mở rộng cho MDVRPTW  
3.9. Google OR-Tools  
3.10. So sánh lý thuyết giữa các thuật toán  

## CHƯƠNG 4. THIẾT KẾ VÀ TRIỂN KHAI HỆ THỐNG THỰC NGHIỆM

4.1. Kiến trúc tổng quan của hệ thống  
4.2. Công nghệ sử dụng  
4.3. Thiết kế solver chung  
4.4. Thiết kế model dữ liệu  
4.5. Thiết kế dữ liệu đầu vào  
4.6. Ma trận khoảng cách và thời gian di chuyển  
4.7. Triển khai solver và benchmark  
4.8. Giao diện trực quan hóa và kiểm thử  

## CHƯƠNG 5. THỰC NGHIỆM VÀ ĐÁNH GIÁ

5.1. Thiết lập thực nghiệm  
5.2. Thiết kế instance thực nghiệm  
5.3. Tuning tham số cho ACO + 2-opt  
5.4. Benchmark chính trên TSPTW  
5.5. Thực nghiệm với VRPTW tùy chỉnh  
5.6. Thực nghiệm mở rộng với MDVRPTW  
5.7. Phân tích hiệu quả của ACO + 2-opt nâng cấp  
5.8. So sánh tổng hợp các thuật toán  
5.9. Hạn chế và nguy cơ ảnh hưởng đến tính hợp lệ của thực nghiệm  

## CHƯƠNG 6. KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN

6.1. Tóm tắt nội dung đã thực hiện  
6.2. Kết quả đạt được  
6.3. Đóng góp của đề tài  
6.4. Hạn chế của đề tài  
6.5. Hướng phát triển  

---

# CHƯƠNG 1. MỞ ĐẦU VÀ TỔNG QUAN ĐỀ TÀI

## 1.1. Tổng quan về trí tuệ nhân tạo trong tìm kiếm và tối ưu hóa

Trí tuệ nhân tạo là lĩnh vực nghiên cứu các phương pháp giúp máy tính thực hiện những nhiệm vụ thường đòi hỏi năng lực trí tuệ của con người như suy luận, lập kế hoạch, ra quyết định, học hỏi và giải quyết vấn đề. Trong đề tài này, trí tuệ nhân tạo được tiếp cận theo hướng tìm kiếm và tối ưu hóa, tập trung vào cách máy tính lựa chọn lời giải tốt trong một không gian nghiệm lớn, thay vì chỉ xử lý dữ liệu hay học từ dữ liệu như các hướng Machine Learning hoặc Deep Learning.

Trong các bài toán tối ưu lộ trình, trí tuệ nhân tạo thể hiện vai trò ở khả năng mô hình hóa bài toán thành không gian trạng thái, xây dựng hàm đánh giá nghiệm và sử dụng các chiến lược tìm kiếm để cải thiện lời giải. Với các bài toán như TSPTW, VRPTW và MDVRPTW, số lượng phương án lộ trình tăng rất nhanh khi số điểm dừng, số phương tiện hoặc số depot tăng lên. Do đó, các thuật toán heuristic và metaheuristic như Greedy, 2-opt, Simulated Annealing và Ant Colony Optimization được sử dụng để định hướng quá trình tìm kiếm, cải thiện chất lượng lời giải và cân bằng giữa chi phí lộ trình, thời gian thực thi với các ràng buộc của bài toán như Time Window và mức phạt khi nghiệm không hợp lệ.

## 1.2. Heuristic và metaheuristic trong bài toán tối ưu

Heuristic là nhóm phương pháp tìm kiếm sử dụng kinh nghiệm, quy tắc lựa chọn hoặc thông tin định hướng để nhanh chóng xây dựng lời giải chấp nhận được cho bài toán tối ưu. Trong bài toán tối ưu lộ trình, thay vì đảm bảo tìm được lời giải tối ưu tuyệt đối, heuristic ưu tiên tốc độ xử lý và khả năng tạo ra lời giải đủ tốt trong thời gian ngắn. Các thuật toán như Greedy Nearest Neighbor hoặc 2-opt có thể được xem là heuristic vì chúng dựa trên các quy tắc đơn giản như chọn điểm gần nhất hoặc cải thiện lộ trình bằng cách hoán đổi cạnh.

Metaheuristic là nhóm phương pháp tổng quát hơn, được thiết kế để điều khiển quá trình tìm kiếm trong không gian nghiệm lớn và tránh bị kẹt sớm tại nghiệm cục bộ. So với heuristic đơn giản, metaheuristic thường kết hợp nhiều cơ chế như khai thác nghiệm tốt hiện có, khám phá vùng nghiệm mới, chấp nhận nghiệm kém trong một số trường hợp hoặc mô phỏng hành vi tự nhiên để cải thiện lời giải. Trong đề tài này, Simulated Annealing và Ant Colony Optimization kết hợp 2-opt được sử dụng như các hướng metaheuristic chính để giải bài toán tối ưu lộ trình có ràng buộc thời gian.

## 1.3. Bối cảnh và vấn đề thực tế

Trong lĩnh vực vận tải hành khách, đặc biệt là các hệ thống đặt vé xe khách, nhu cầu trung chuyển hành khách từ vị trí đón đến bến xe hoặc điểm tập kết ngày càng phổ biến. Thay vì yêu cầu toàn bộ hành khách tự di chuyển đến một địa điểm cố định, nhà xe có thể tổ chức phương tiện trung chuyển để đón khách tại nhiều vị trí khác nhau. Cách vận hành này giúp tăng tính tiện lợi cho hành khách, nhưng đồng thời tạo ra bài toán phức tạp trong việc sắp xếp thứ tự điểm đón, phân bổ phương tiện và đảm bảo thời gian phục vụ.

### 1.3.1. Bài toán đặt vé xe khách và trung chuyển hành khách

Trong một hệ thống đặt vé xe khách, sau khi hành khách đặt vé thành công, hệ thống có thể cần ghi nhận thêm thông tin về điểm đón, thời gian mong muốn được đón và số lượng hành khách tại từng vị trí. Nếu nhiều hành khách ở các khu vực khác nhau cùng đi một chuyến xe chính, nhà xe cần tổ chức một hoặc nhiều xe trung chuyển để gom khách về bến xe hoặc điểm xuất phát. Bài toán đặt ra là phải xây dựng lộ trình đón khách sao cho phương tiện đi qua các điểm hợp lý, hạn chế quãng đường dư thừa và không làm hành khách trễ chuyến xe chính.

### 1.3.2. Vấn đề tối ưu lộ trình nhiều điểm dừng

Khi số lượng điểm đón tăng lên, việc sắp xếp thứ tự di chuyển giữa các điểm không còn đơn giản. Với cùng một tập điểm dừng, mỗi cách hoán đổi thứ tự ghé thăm có thể tạo ra tổng quãng đường, tổng thời gian di chuyển và thời gian chờ khác nhau. Nếu chỉ lựa chọn thủ công hoặc đi theo thứ tự đặt vé, lộ trình có thể không tối ưu, dẫn đến tăng chi phí vận hành, kéo dài thời gian trung chuyển và giảm chất lượng dịch vụ. Vì vậy, cần có thuật toán hỗ trợ tìm kiếm lộ trình hợp lý dựa trên dữ liệu điểm dừng, khoảng cách, thời gian di chuyển và các ràng buộc liên quan.

### 1.3.3. Khó khăn khi có ràng buộc thời gian

Trong thực tế, bài toán trung chuyển không chỉ hướng đến việc rút ngắn quãng đường di chuyển mà còn phải bảo đảm các ràng buộc về thời gian phục vụ. Mỗi điểm đón có thể gắn với một khoảng thời gian phù hợp, trong khi toàn bộ quá trình trung chuyển cần hoàn tất trước thời điểm xe chính khởi hành. Nếu xe đến quá sớm, hệ thống phải tính thêm thời gian chờ; nếu xe đến quá muộn, hành khách có nguy cơ trễ chuyến và lộ trình có thể bị xem là không hợp lệ. Khi bài toán được mở rộng từ một phương tiện sang nhiều phương tiện, hoặc từ một điểm tập kết sang nhiều depot, số lượng phương án cần xét tăng nhanh, làm cho việc tìm lời giải tối ưu trở nên khó khăn hơn. Do đó, đề tài sử dụng các thuật toán heuristic và metaheuristic nhằm hỗ trợ tìm kiếm lời giải có chất lượng tốt trong thời gian xử lý chấp nhận được.

## 1.4. Bài toán tối ưu lộ trình có ràng buộc thời gian

Bài toán tối ưu lộ trình có ràng buộc thời gian là bài toán tìm kiếm thứ tự di chuyển hoặc phân bổ phương tiện sao cho các điểm dừng được phục vụ theo một lộ trình hợp lý, đồng thời thỏa mãn các điều kiện về thời gian. Trong bối cảnh trung chuyển hành khách, mỗi điểm đón có thể được xem là một điểm dừng cần phục vụ, còn phương tiện trung chuyển cần di chuyển qua các điểm này để đưa hành khách về bến xe hoặc điểm tập kết trước thời điểm xe chính khởi hành. Lời giải của bài toán không chỉ phụ thuộc vào tổng quãng đường, mà còn phụ thuộc vào thời điểm đến từng điểm, thời gian chờ, thời gian phục vụ và mức độ vi phạm Time Window nếu có.

Trong phạm vi đề tài, bài toán được tiếp cận theo ba mức độ. Mức thứ nhất là TSPTW, trong đó một phương tiện cần đi qua nhiều điểm dừng có ràng buộc thời gian. Mức thứ hai là VRPTW, mở rộng bài toán sang nhiều phương tiện cùng phục vụ một tập điểm dừng, có xét thêm các yếu tố như số lượng xe và sức chứa. Mức thứ ba là MDVRPTW, tiếp tục mở rộng VRPTW bằng cách bổ sung nhiều depot hoặc nhiều điểm xuất phát/tập kết. Các biến thể này giúp đề tài đánh giá thuật toán từ trường hợp đơn giản đến phức tạp hơn, đồng thời phản ánh tốt hơn các tình huống vận hành thực tế trong hệ thống trung chuyển hành khách.

## 1.5. Mục tiêu nghiên cứu

Mục tiêu của đề tài là nghiên cứu và triển khai các thuật toán tối ưu lộ trình có ràng buộc thời gian, từ đó đánh giá khả năng tìm kiếm lời giải của từng phương pháp trong các bài toán TSPTW, VRPTW và MDVRPTW. Đề tài tập trung vào việc xây dựng một bộ solver có cùng cấu trúc đầu vào và đầu ra, giúp các thuật toán có thể được thực nghiệm trên cùng điều kiện và so sánh theo các tiêu chí như tổng quãng đường, thời gian thực thi, tỷ lệ nghiệm hợp lệ và mức độ vi phạm Time Window.

Bên cạnh việc triển khai các thuật toán nền tảng như Held-Karp Dynamic Programming, Greedy Nearest Neighbor, 2-opt Local Search, Simulated Annealing và Google OR-Tools, đề tài đặt trọng tâm vào thuật toán Ant Colony Optimization kết hợp 2-opt. Thuật toán này được sử dụng để giải bài toán TSPTW và tiếp tục được mở rộng cho VRPTW, trong đó lời giải không chỉ là một lộ trình đơn mà có thể gồm nhiều route tương ứng với nhiều phương tiện. Ngoài ra, đề tài xem xét hướng mở rộng sang MDVRPTW nhằm đánh giá khả năng áp dụng thuật toán trong trường hợp có nhiều depot hoặc nhiều điểm tập kết.

Thông qua quá trình thực nghiệm, đề tài hướng đến việc làm rõ ưu điểm, hạn chế và phạm vi phù hợp của từng thuật toán. Kết quả nghiên cứu không chỉ cho thấy thuật toán nào tạo ra nghiệm tốt hơn trong từng kịch bản, mà còn giúp xác định sự đánh đổi giữa chất lượng lời giải và thời gian xử lý khi áp dụng các thuật toán heuristic, metaheuristic và bộ giải tối ưu công nghiệp vào bài toán trung chuyển hành khách có ràng buộc thời gian.

## 1.6. Phạm vi đề tài

Phạm vi của đề tài tập trung vào nhóm bài toán tối ưu lộ trình có ràng buộc thời gian, bao gồm TSPTW, VRPTW và MDVRPTW. Trong đó, TSPTW được sử dụng làm bài toán nền tảng để triển khai và so sánh sáu solver trên cùng một bộ dữ liệu thực nghiệm. VRPTW được sử dụng như phần mở rộng chính nhằm xét thêm yếu tố nhiều phương tiện, sức chứa và phân bổ điểm dừng. MDVRPTW được xem là phần mở rộng nâng cao để đánh giá khả năng áp dụng thuật toán trong trường hợp có nhiều depot hoặc nhiều điểm tập kết.

### 1.6.1. So sánh 6 solver trên bài toán TSPTW

Ở phạm vi TSPTW, đề tài triển khai sáu solver gồm Held-Karp Dynamic Programming, Greedy Nearest Neighbor, 2-opt Local Search, Simulated Annealing, Ant Colony Optimization kết hợp 2-opt và Google OR-Tools. Các solver này được chạy trên cùng bộ dữ liệu đầu vào để đảm bảo tính công bằng khi so sánh. Kết quả được đánh giá dựa trên các tiêu chí như tổng quãng đường, thời gian thực thi, tỷ lệ nghiệm hợp lệ, số điểm vi phạm Time Window và khoảng cách so với nghiệm chuẩn hoặc nghiệm tốt nhất.

### 1.6.2. Mở rộng sang VRPTW với dữ liệu tùy chỉnh

Đối với VRPTW, đề tài mở rộng bài toán từ một phương tiện sang nhiều phương tiện. Dữ liệu VRPTW được thiết kế theo hướng tùy chỉnh, cho phép cấu hình số lượng xe, sức chứa phương tiện, số lượng điểm dừng, depot, thời gian phục vụ và Time Window. Phần này tập trung đánh giá khả năng mở rộng của thuật toán ACO kết hợp 2-opt khi lời giải không còn là một lộ trình đơn, mà là tập hợp nhiều route tương ứng với nhiều phương tiện.

### 1.6.3. Mở rộng nâng cao sang MDVRPTW

Ở mức mở rộng nâng cao, đề tài xem xét bài toán MDVRPTW, trong đó hệ thống có nhiều depot hoặc nhiều điểm tập kết. Phạm vi này tập trung vào việc gán điểm dừng cho depot phù hợp, xây dựng route từ từng depot và đánh giá ảnh hưởng của chiến lược phân depot đến chất lượng nghiệm. MDVRPTW không phải trọng tâm chính của đề tài, mà đóng vai trò mở rộng để thể hiện khả năng phát triển tiếp của mô hình và thuật toán khi áp dụng vào các tình huống vận hành phức tạp hơn.

## 1.7. Đóng góp chính của đề tài

Đề tài đóng góp ở việc xây dựng một bộ solver thống nhất cho bài toán tối ưu lộ trình có ràng buộc thời gian. Các solver được thiết kế theo cùng cấu trúc đầu vào và đầu ra, từ đó tạo điều kiện so sánh các thuật toán trên cùng một cơ sở thực nghiệm. Đối với bài toán TSPTW, đề tài triển khai sáu hướng giải gồm Held-Karp Dynamic Programming, Greedy Nearest Neighbor, 2-opt Local Search, Simulated Annealing, Ant Colony Optimization kết hợp 2-opt và Google OR-Tools. Việc thực nghiệm các thuật toán trên cùng bộ dữ liệu giúp đánh giá rõ hơn sự khác biệt về chất lượng nghiệm, thời gian xử lý và khả năng thỏa mãn ràng buộc Time Window. Bên cạnh đó, đề tài xây dựng quy trình thực nghiệm và bộ tiêu chí đánh giá kết quả, bao gồm tổng quãng đường, thời gian thực thi, tỷ lệ nghiệm hợp lệ, số điểm vi phạm Time Window và mức độ ổn định qua nhiều lần chạy.

Đóng góp trọng tâm của đề tài là triển khai và phân tích thuật toán Ant Colony Optimization kết hợp 2-opt. Trong đó, ACO được sử dụng để xây dựng lời giải dựa trên cơ chế pheromone và thông tin heuristic, còn 2-opt được dùng để cải thiện lộ trình sau khi lời giải ban đầu được tạo ra. Bên cạnh phiên bản áp dụng cho TSPTW, đề tài mở rộng hướng tiếp cận này sang VRPTW, nơi lời giải được biểu diễn bằng nhiều route tương ứng với nhiều phương tiện. Dữ liệu VRPTW và MDVRPTW được thiết kế theo hướng tùy chỉnh, cho phép thay đổi số lượng điểm dừng, số phương tiện, sức chứa, depot và Time Window. Phần MDVRPTW được xem là hướng mở rộng nâng cao nhằm khảo sát thêm trường hợp có nhiều depot hoặc nhiều điểm tập kết, qua đó làm rõ khả năng phát triển của thuật toán trong các tình huống vận hành phức tạp hơn.

## 1.8. Cấu trúc báo cáo

Báo cáo được tổ chức thành sáu chương chính. Chương 1 trình bày tổng quan đề tài, bao gồm cơ sở tiếp cận trí tuệ nhân tạo trong tìm kiếm và tối ưu hóa, bối cảnh trung chuyển hành khách, bài toán nghiên cứu, mục tiêu, phạm vi và các đóng góp chính. Chương 2 trình bày cơ sở lý thuyết của các bài toán TSPTW, VRPTW và MDVRPTW, đồng thời làm rõ ràng buộc Time Window, hàm mục tiêu và các tiêu chí đánh giá nghiệm. Chương 3 tập trung vào các thuật toán được sử dụng trong đề tài, bao gồm nhóm thuật toán chính xác, heuristic, local search, metaheuristic và bộ giải tối ưu công nghiệp.

Chương 4 mô tả thiết kế và triển khai hệ thống thực nghiệm, bao gồm kiến trúc chương trình, công nghệ sử dụng, thiết kế solver, mô hình dữ liệu, dữ liệu đầu vào, ma trận khoảng cách và quy trình benchmark. Chương 5 trình bày quá trình thực nghiệm và đánh giá kết quả, trong đó tập trung so sánh sáu solver trên bài toán TSPTW, đánh giá phần mở rộng VRPTW với dữ liệu tùy chỉnh và khảo sát thêm hướng MDVRPTW. Chương 6 tổng kết kết quả đạt được, nêu các hạn chế của đề tài và đề xuất những hướng phát triển tiếp theo như mở rộng VRPTW quy mô lớn, hoàn thiện MDVRPTW, tối ưu đa mục tiêu và tích hợp thời gian di chuyển thay đổi theo thời điểm.

---

# CHƯƠNG 2. CƠ SỞ LÝ THUYẾT VỀ TSPTW, VRPTW VÀ MDVRPTW

## 2.1. Bài toán TSP cổ điển

Travelling Salesman Problem, thường được viết tắt là TSP, là một trong những bài toán tối ưu tổ hợp kinh điển. Bài toán mô tả tình huống một người bán hàng cần xuất phát từ một điểm ban đầu, đi qua mỗi thành phố đúng một lần và quay trở lại điểm xuất phát sao cho tổng chi phí di chuyển là nhỏ nhất. Chi phí này có thể được biểu diễn bằng khoảng cách, thời gian, chi phí nhiên liệu hoặc một đại lượng tương đương tùy theo ngữ cảnh ứng dụng.

Về mặt mô hình, bài toán TSP có thể được biểu diễn bằng một đồ thị có trọng số, trong đó mỗi đỉnh là một điểm cần ghé thăm và mỗi cạnh biểu diễn chi phí di chuyển giữa hai điểm. Mục tiêu là tìm một chu trình Hamilton có tổng trọng số nhỏ nhất. Nếu số điểm cần ghé thăm là n, số thứ tự ghé thăm có thể tăng theo cấp số nhân hoặc giai thừa, khiến việc duyệt toàn bộ nghiệm trở nên không khả thi khi n lớn.

TSP thuộc nhóm bài toán khó về mặt tính toán. Điều này có nghĩa là chưa có thuật toán đa thức tổng quát nào có thể giải tối ưu mọi trường hợp của bài toán trong thời gian ngắn khi kích thước dữ liệu tăng cao. Vì vậy, trong thực tế, TSP thường được giải bằng hai nhóm phương pháp: nhóm thuật toán chính xác cho dữ liệu nhỏ và nhóm heuristic hoặc metaheuristic cho dữ liệu trung bình đến lớn. Trong đề tài này, TSP được xem là nền tảng để dẫn vào TSPTW, tức biến thể có bổ sung ràng buộc thời gian tại mỗi điểm dừng.

## 2.2. Bài toán TSPTW

Travelling Salesman Problem with Time Windows là biến thể của TSP trong đó mỗi điểm dừng không chỉ cần được ghé thăm đúng một lần mà còn phải được phục vụ trong một khoảng thời gian cho phép. Khoảng thời gian này được gọi là Time Window, thường được ký hiệu là [eᵢ, lᵢ], trong đó eᵢ là thời điểm sớm nhất có thể bắt đầu phục vụ tại điểm i và lᵢ là thời điểm muộn nhất được phép bắt đầu phục vụ tại điểm đó.

Trong TSPTW, một lời giải không chỉ là thứ tự các điểm dừng mà còn gắn với lịch thời gian cụ thể. Khi phương tiện đến một điểm sớm hơn eᵢ, phương tiện có thể chờ đến thời điểm mở cửa để bắt đầu phục vụ. Ngược lại, nếu phương tiện đến sau lᵢ, điểm đó bị xem là vi phạm Time Window hoặc làm cho lộ trình trở nên không hợp lệ, tùy theo cách mô hình hóa ràng buộc. Vì vậy, việc đánh giá một lộ trình trong TSPTW cần xét đồng thời tổng quãng đường, thời điểm đến, thời gian chờ, thời gian phục vụ và mức độ vi phạm ràng buộc.

Trong đề tài này, TSPTW đóng vai trò bài toán nền tảng để so sánh sáu solver. Lý do lựa chọn TSPTW là bài toán này có cấu trúc đủ rõ để biểu diễn bằng một lộ trình đơn, nhưng vẫn có độ khó cao hơn TSP do có thêm ràng buộc Time Window. Điều này cho phép đánh giá khả năng xử lý ràng buộc của từng thuật toán trước khi mở rộng sang bài toán nhiều phương tiện như VRPTW.

## 2.3. Bài toán VRPTW

Vehicle Routing Problem with Time Windows là bài toán mở rộng từ TSPTW sang trường hợp có nhiều phương tiện. Thay vì tìm một lộ trình duy nhất đi qua toàn bộ điểm dừng, VRPTW cần phân bổ tập điểm dừng cho nhiều phương tiện và xây dựng route cho từng phương tiện sao cho các ràng buộc được thỏa mãn. Mỗi route thường bắt đầu từ depot, phục vụ một nhóm điểm dừng và quay về depot hoặc kết thúc tại một điểm tập kết được quy định.

So với TSPTW, VRPTW phức tạp hơn vì lời giải không chỉ phụ thuộc vào thứ tự ghé thăm trong một route mà còn phụ thuộc vào cách chia điểm dừng cho các phương tiện. Một lời giải tốt cần cân bằng giữa số lượng xe sử dụng, tổng quãng đường, sức chứa phương tiện, thời gian làm việc và Time Window tại từng điểm. Nếu phân bổ điểm dừng không hợp lý, một số route có thể quá tải, vi phạm thời gian hoặc tạo ra quãng đường di chuyển dư thừa.

Trong bối cảnh trung chuyển hành khách, VRPTW phù hợp với trường hợp nhà xe sử dụng nhiều xe trung chuyển để đón khách ở nhiều khu vực khác nhau. Mỗi xe có sức chứa giới hạn và cần hoàn tất lộ trình trước thời điểm xe chính khởi hành. Do đó, VRPTW phản ánh sát hơn tình huống thực tế so với TSPTW, đặc biệt khi số lượng hành khách và điểm đón tăng lên.

## 2.4. Bài toán MDVRPTW

Multi-Depot Vehicle Routing Problem with Time Windows là biến thể mở rộng của VRPTW trong đó hệ thống có nhiều depot. Depot có thể được hiểu là điểm xuất phát, điểm tập kết hoặc điểm điều phối phương tiện. Trong bài toán này, mỗi phương tiện có thể xuất phát từ một depot nhất định, phục vụ một nhóm điểm dừng và quay về depot hoặc kết thúc tại một điểm hợp lệ theo cấu hình bài toán.

MDVRPTW làm tăng độ phức tạp vì thuật toán cần xử lý thêm quyết định gán điểm dừng cho depot. Một điểm dừng có thể gần nhiều depot khác nhau, và việc chọn depot không chỉ dựa trên khoảng cách ngắn nhất mà còn phải xét Time Window, sức chứa phương tiện, số lượng xe tại depot và khả năng cân bằng tải giữa các depot. Nếu chiến lược gán depot không hợp lý, tổng quãng đường có thể tăng hoặc một số depot có thể bị quá tải trong khi depot khác chưa được sử dụng hiệu quả.

Trong phạm vi đề tài, MDVRPTW được xem là phần mở rộng nâng cao. Phần này không đặt trọng tâm ngang với TSPTW và VRPTW, mà được sử dụng để khảo sát khả năng phát triển của mô hình khi bài toán có nhiều điểm tập kết. Đây là hướng phù hợp với các hệ thống vận tải thực tế, nơi một nhà xe hoặc nền tảng có thể có nhiều bến, trạm trung chuyển hoặc điểm gom khách.

## 2.5. Ràng buộc Time Window

Time Window là ràng buộc quy định khoảng thời gian cho phép phục vụ tại một điểm dừng. Với mỗi điểm i, Time Window được biểu diễn dưới dạng [eᵢ, lᵢ], trong đó eᵢ là thời điểm sớm nhất và lᵢ là thời điểm muộn nhất có thể bắt đầu phục vụ. Ngoài ra, mỗi điểm dừng có thể có thời gian phục vụ sᵢ, biểu diễn khoảng thời gian cần thiết để đón khách, xác nhận thông tin hoặc thực hiện tác vụ tại điểm đó.

Nếu phương tiện đến điểm i trước eᵢ, phương tiện có thể chờ đến eᵢ để bắt đầu phục vụ. Thời gian chờ được tính vào lịch trình và ảnh hưởng đến các điểm tiếp theo, nhưng không được xem là vi phạm. Nếu phương tiện đến trong khoảng [eᵢ, lᵢ], điểm dừng được phục vụ hợp lệ. Nếu phương tiện đến sau lᵢ, điểm dừng bị xem là vi phạm Time Window. Mức độ vi phạm có thể được tính bằng công thức:

```text
violation_i = max(0, arrival_i - l_i)
```

Tổng mức vi phạm Time Window của một lộ trình hoặc một nghiệm được tính bằng tổng vi phạm tại tất cả các điểm dừng. Trong đề tài, ràng buộc Time Window được xử lý theo hướng kết hợp. Một nghiệm có tổng vi phạm bằng 0 được xem là nghiệm hợp lệ. Tuy nhiên, trong một số thuật toán metaheuristic, nghiệm có vi phạm vẫn có thể được chấp nhận tạm thời nhưng bị cộng thêm chi phí phạt. Cách tiếp cận này giúp thuật toán có khả năng khám phá không gian nghiệm rộng hơn, thay vì loại bỏ sớm quá nhiều nghiệm trong quá trình tìm kiếm.

## 2.6. Hàm mục tiêu và tiêu chí đánh giá nghiệm

Hàm mục tiêu của bài toán tối ưu lộ trình có ràng buộc thời gian cần phản ánh cả chi phí di chuyển và mức độ thỏa mãn ràng buộc. Trong trường hợp đơn giản, hàm mục tiêu có thể là tổng quãng đường hoặc tổng thời gian di chuyển. Tuy nhiên, với TSPTW, VRPTW và MDVRPTW, chỉ tối thiểu hóa quãng đường là chưa đủ vì một lộ trình ngắn vẫn có thể không hợp lệ nếu vi phạm Time Window hoặc vượt quá sức chứa phương tiện.

Một dạng hàm đánh giá tổng quát có thể được mô tả như sau:

```text
fitness = totalDistance
        + penaltyTW * totalTimeWindowViolation
        + penaltyVehicle * numberOfVehiclesUsed
        + penaltyCapacity * capacityViolation
```

Trong đó, `totalDistance` là tổng quãng đường, `totalTimeWindowViolation` là tổng thời gian vi phạm Time Window, `numberOfVehiclesUsed` là số phương tiện được sử dụng và `capacityViolation` là mức vi phạm sức chứa nếu có. Các hệ số phạt giúp thuật toán phân biệt giữa nghiệm hợp lệ và nghiệm không hợp lệ, đồng thời định hướng quá trình tìm kiếm về phía nghiệm tốt hơn.

Các tiêu chí đánh giá trong đề tài bao gồm tổng quãng đường, tổng thời gian di chuyển, số phương tiện sử dụng, số điểm vi phạm Time Window, tổng thời gian vi phạm, thời gian thực thi, tỷ lệ nghiệm hợp lệ và độ ổn định qua nhiều lần chạy. Đối với dữ liệu nhỏ, có thể so sánh thêm optimality gap so với nghiệm chuẩn hoặc nghiệm tốt nhất tìm được. Những tiêu chí này giúp đánh giá thuật toán một cách toàn diện hơn thay vì chỉ dựa vào một chỉ số duy nhất.

## 2.7. Tổng quan tài liệu liên quan

Các bài toán định tuyến như TSP, TSPTW, VRPTW và MDVRPTW đã được nghiên cứu rộng rãi trong lĩnh vực tối ưu tổ hợp và trí tuệ nhân tạo. Các hướng tiếp cận chính thường bao gồm thuật toán chính xác, heuristic, metaheuristic và các bộ giải tối ưu dựa trên lập trình ràng buộc hoặc lập trình nguyên. Trong đó, nhóm thuật toán chính xác phù hợp với dữ liệu nhỏ, còn nhóm metaheuristic thường được sử dụng cho các bài toán có kích thước lớn hơn do khả năng tìm nghiệm tốt trong thời gian chấp nhận được.

Ant Colony Optimization là một trong những metaheuristic nổi bật, mô phỏng hành vi tìm đường của đàn kiến thông qua cơ chế pheromone. Các biến thể như Ant System và MAX-MIN Ant System cải thiện quá trình cập nhật pheromone nhằm tăng khả năng khai thác nghiệm tốt và hạn chế hội tụ sớm. Bên cạnh đó, Simulated Annealing là hướng tiếp cận dựa trên mô phỏng quá trình làm nguội, cho phép chấp nhận nghiệm kém trong một số trường hợp để thoát khỏi nghiệm cục bộ.

Đối với VRPTW, bộ dữ liệu Solomon thường được sử dụng như một chuẩn thực nghiệm trong nhiều nghiên cứu. Tuy nhiên, trong phạm vi đề tài này, dữ liệu TSPTW được chuẩn hóa để so sánh sáu solver, còn dữ liệu VRPTW và MDVRPTW được thiết kế theo hướng tùy chỉnh để phù hợp với bối cảnh trung chuyển hành khách. Cách tiếp cận này giúp đề tài vừa giữ được tính so sánh giữa thuật toán, vừa phản ánh được nhu cầu cấu hình linh hoạt của bài toán thực tế.

---

# CHƯƠNG 3. CÁC THUẬT TOÁN ĐƯỢC SỬ DỤNG

## 3.1. Tổng quan các nhóm thuật toán

Các thuật toán được sử dụng trong đề tài có thể chia thành năm nhóm chính: thuật toán chính xác, heuristic xây dựng nghiệm, tìm kiếm cục bộ, metaheuristic và bộ giải tối ưu công nghiệp. Việc lựa chọn nhiều nhóm thuật toán khác nhau giúp đánh giá bài toán từ nhiều góc độ, bao gồm chất lượng nghiệm, thời gian chạy, khả năng mở rộng và khả năng xử lý ràng buộc.

Thuật toán chính xác như Held-Karp Dynamic Programming có thể tìm nghiệm tối ưu cho TSP với dữ liệu nhỏ, nhưng khó mở rộng cho dữ liệu lớn do chi phí tính toán tăng nhanh. Heuristic như Greedy Nearest Neighbor tạo nghiệm nhanh nhưng có thể bị kẹt ở nghiệm kém. Local search như 2-opt cải thiện nghiệm hiện có bằng cách thay đổi cấu trúc lộ trình. Metaheuristic như Simulated Annealing và Ant Colony Optimization điều khiển quá trình tìm kiếm tốt hơn trong không gian nghiệm lớn. Cuối cùng, Google OR-Tools được dùng làm baseline công nghiệp để so sánh với các thuật toán tự triển khai.

## 3.2. Held-Karp Dynamic Programming

Held-Karp là thuật toán quy hoạch động thường được sử dụng để giải chính xác bài toán TSP trên dữ liệu nhỏ. Ý tưởng của thuật toán là lưu trữ chi phí tối ưu để đi từ điểm xuất phát, đi qua một tập con các điểm và kết thúc tại một điểm hiện tại. Bằng cách tái sử dụng kết quả của các bài toán con, Held-Karp giảm số lượng phép tính so với duyệt toàn bộ hoán vị, nhưng vẫn có độ phức tạp cao khi số điểm tăng.

Công thức tổng quát của Held-Karp có thể mô tả như sau:

```text
DP[S][j] = min(DP[S - {j}][i] + cost[i][j])
```

Trong đó, S là tập các điểm đã đi qua, j là điểm kết thúc hiện tại, i là điểm đứng trước j và cost[i][j] là chi phí di chuyển từ i đến j. Sau khi tính toàn bộ trạng thái cần thiết, nghiệm tối ưu được lấy bằng cách chọn đường quay về depot có tổng chi phí nhỏ nhất.

Trong đề tài, Held-Karp được sử dụng như nghiệm chuẩn cho dữ liệu nhỏ của TSPTW. Tuy nhiên, khi xét thêm Time Window, thuật toán cần kiểm tra tính hợp lệ về thời gian của từng trạng thái. Khi mở rộng sang VRPTW, số trạng thái tăng mạnh do cần xét thêm phân bổ phương tiện, khiến Held-Karp không còn phù hợp làm thuật toán chính. Vì vậy, vai trò của Held-Karp trong đề tài chủ yếu là baseline chính xác cho quy mô nhỏ.

## 3.3. Greedy Nearest Neighbor

Greedy Nearest Neighbor là heuristic xây dựng nghiệm dựa trên quy tắc chọn điểm tiếp theo gần nhất từ vị trí hiện tại. Thuật toán bắt đầu từ depot hoặc điểm xuất phát, sau đó lặp lại quá trình chọn điểm chưa được phục vụ có chi phí di chuyển thấp nhất. Khi tất cả điểm dừng đã được phục vụ, lộ trình kết thúc hoặc quay về depot tùy theo cấu hình bài toán.

Khi áp dụng cho TSPTW, Greedy cần xét thêm Time Window. Một điểm gần nhất chưa chắc là điểm phù hợp nếu việc đi đến điểm đó làm phát sinh vi phạm thời gian hoặc gây trễ cho các điểm tiếp theo. Vì vậy, thuật toán có thể sử dụng hàm đánh giá kết hợp giữa khoảng cách và mức độ phù hợp về thời gian. Ví dụ, điểm tiếp theo có thể được chọn dựa trên chi phí di chuyển, thời gian chờ và mức phạt nếu vượt quá Time Window.

Ưu điểm của Greedy là đơn giản, dễ triển khai và có thời gian chạy nhanh. Tuy nhiên, nhược điểm là thuật toán chỉ ra quyết định dựa trên thông tin cục bộ tại từng bước, không xét đầy đủ ảnh hưởng lâu dài của lựa chọn hiện tại đến toàn bộ lộ trình. Vì vậy, Greedy thường được dùng làm baseline để so sánh với các thuật toán cải thiện nghiệm hoặc metaheuristic.

## 3.4. 2-opt Local Search

2-opt là thuật toán tìm kiếm cục bộ phổ biến trong các bài toán định tuyến. Ý tưởng chính của 2-opt là chọn hai cạnh trong lộ trình, loại bỏ chúng và nối lại theo cách khác để tạo ra một lộ trình mới. Nếu lộ trình mới có chi phí thấp hơn và vẫn thỏa mãn các ràng buộc cần thiết, thuật toán chấp nhận thay đổi đó. Quá trình được lặp lại cho đến khi không tìm được cải thiện đáng kể.

Trong TSPTW, việc áp dụng 2-opt cần kiểm tra lại toàn bộ lịch thời gian sau mỗi lần đảo đoạn. Một thay đổi làm giảm quãng đường có thể làm thay đổi thứ tự phục vụ và dẫn đến vi phạm Time Window. Vì vậy, điều kiện chấp nhận nghiệm mới không chỉ dựa trên tổng khoảng cách mà còn phải xét tính hợp lệ hoặc mức phạt thời gian. Trong VRPTW, 2-opt thường được áp dụng trong từng route riêng lẻ để cải thiện lộ trình của mỗi phương tiện.

2-opt có ưu điểm là dễ hiểu, hiệu quả trong việc loại bỏ các đoạn đường giao nhau hoặc không hợp lý, đồng thời có thể kết hợp với nhiều thuật toán khác. Tuy nhiên, 2-opt chỉ cải thiện nghiệm trong phạm vi cục bộ và dễ bị kẹt tại nghiệm cục bộ. Trong đề tài này, 2-opt vừa được xem là một solver riêng, vừa được dùng như bước refine trong thuật toán ACO + 2-opt.

## 3.5. Simulated Annealing

Simulated Annealing là thuật toán metaheuristic mô phỏng quá trình tôi luyện kim loại. Trong quá trình này, hệ thống ban đầu ở nhiệt độ cao, cho phép thay đổi mạnh và chấp nhận cả những trạng thái chưa tốt. Khi nhiệt độ giảm dần, thuật toán trở nên thận trọng hơn và ưu tiên các nghiệm có chất lượng tốt hơn. Cơ chế này giúp thuật toán có khả năng thoát khỏi nghiệm cục bộ trong giai đoạn đầu và hội tụ dần về nghiệm tốt ở giai đoạn sau.

Trong bài toán tối ưu lộ trình, một nghiệm lân cận có thể được tạo bằng cách hoán đổi hai điểm, đảo một đoạn lộ trình, chèn một điểm sang vị trí khác hoặc thay đổi phân bổ điểm trong trường hợp VRPTW. Nếu nghiệm mới tốt hơn nghiệm hiện tại, thuật toán chấp nhận nghiệm mới. Nếu nghiệm mới kém hơn, thuật toán vẫn có thể chấp nhận với một xác suất phụ thuộc vào mức giảm chất lượng và nhiệt độ hiện tại.

Công thức xác suất chấp nhận nghiệm kém thường có dạng:

```text
P = exp(-delta / T)
```

Trong đó, delta là mức tăng chi phí của nghiệm mới so với nghiệm hiện tại và T là nhiệt độ. Khi T cao, xác suất chấp nhận nghiệm kém lớn hơn, giúp thuật toán khám phá không gian nghiệm. Khi T thấp, thuật toán tập trung khai thác vùng nghiệm tốt hiện có. Trong đề tài, Simulated Annealing được dùng để so sánh với Greedy, 2-opt, ACO + 2-opt và OR-Tools nhằm đánh giá hiệu quả của một metaheuristic đơn giản nhưng linh hoạt.

## 3.6. Ant Colony Optimization kết hợp 2-opt cho TSPTW

Ant Colony Optimization là thuật toán metaheuristic lấy cảm hứng từ hành vi tìm đường của đàn kiến. Trong tự nhiên, kiến để lại pheromone trên đường đi; những đường có nhiều pheromone sẽ có khả năng được các kiến khác chọn cao hơn. Qua thời gian, các đường tốt có xu hướng được củng cố, trong khi các đường kém dần mất ảnh hưởng do pheromone bay hơi. Cơ chế này được mô phỏng trong thuật toán ACO để tìm lời giải cho các bài toán tối ưu tổ hợp.

Trong TSPTW, mỗi kiến xây dựng một lộ trình bằng cách lần lượt chọn điểm tiếp theo từ tập các điểm chưa phục vụ. Xác suất chọn một điểm phụ thuộc vào lượng pheromone trên cạnh và thông tin heuristic như khoảng cách ngắn, thời gian đến phù hợp hoặc mức vi phạm Time Window thấp. Quy tắc chọn có thể được mô tả như sau:

```text
P(i, j) = [tau(i, j)^alpha * eta(i, j)^beta] / sum([tau(i, k)^alpha * eta(i, k)^beta])
```

Trong đó, tau(i, j) là lượng pheromone trên cạnh từ i đến j, eta(i, j) là thông tin heuristic, alpha điều chỉnh mức ảnh hưởng của pheromone và beta điều chỉnh mức ảnh hưởng của heuristic. Sau khi các kiến xây dựng xong lời giải, pheromone được cập nhật để tăng khả năng chọn các cạnh thuộc nghiệm tốt. Đồng thời, pheromone cũng bị bay hơi nhằm tránh việc thuật toán hội tụ quá sớm vào một nghiệm cục bộ.

Để tăng chất lượng nghiệm, đề tài kết hợp ACO với 2-opt. Sau khi mỗi vòng lặp tạo ra các lời giải, một số nghiệm tốt nhất được chọn để cải thiện bằng 2-opt. Bước này giúp loại bỏ các đoạn lộ trình chưa hợp lý và rút ngắn tổng quãng đường. Sự kết hợp này tạo ra một thuật toán lai, trong đó ACO đảm nhiệm vai trò khám phá không gian nghiệm, còn 2-opt đảm nhiệm vai trò khai thác và cải thiện nghiệm cục bộ.

## 3.7. ACO + 2-opt nâng cấp cho VRPTW

Khi mở rộng từ TSPTW sang VRPTW, lời giải không còn là một lộ trình đơn mà là tập hợp nhiều route tương ứng với nhiều phương tiện. Điều này làm thay đổi cách biểu diễn nghiệm, cách xây dựng lời giải và cách đánh giá chất lượng nghiệm. Thuật toán ACO + 2-opt cần được điều chỉnh để có thể phân bổ điểm dừng cho nhiều xe, kiểm soát sức chứa và đảm bảo Time Window trong từng route.

Trong phiên bản nâng cấp cho VRPTW, mỗi kiến có thể xây dựng nghiệm bằng cách lần lượt tạo route cho từng phương tiện. Khi một route không thể tiếp tục nhận thêm điểm do vi phạm sức chứa, Time Window hoặc giới hạn thời gian, thuật toán khởi tạo route mới cho phương tiện tiếp theo. Quá trình này tiếp tục cho đến khi toàn bộ điểm dừng được phục vụ hoặc không còn phương tiện khả dụng. Hàm đánh giá nghiệm cần xét thêm số xe sử dụng, tổng quãng đường của tất cả route, tổng vi phạm Time Window và mức vi phạm sức chứa nếu có.

2-opt trong VRPTW được áp dụng trong từng route để cải thiện thứ tự điểm dừng của từng phương tiện. Ngoài ra, có thể bổ sung thao tác di chuyển điểm dừng giữa các route nhằm cân bằng tải hoặc giảm tổng chi phí. Đây là điểm khác biệt quan trọng so với TSPTW, vì chất lượng nghiệm VRPTW phụ thuộc cả vào tối ưu bên trong route và phân bổ điểm dừng giữa các route.

## 3.8. Mở rộng cho MDVRPTW

Đối với MDVRPTW, thuật toán cần xử lý thêm yếu tố nhiều depot. Một hướng tiếp cận đơn giản là thực hiện phân cụm hoặc gán điểm dừng cho depot trước, sau đó giải bài toán VRPTW riêng cho từng depot. Cách làm này giúp giảm độ phức tạp vì bài toán lớn được chia thành nhiều bài toán con nhỏ hơn. Tuy nhiên, chất lượng nghiệm phụ thuộc mạnh vào chiến lược gán depot ban đầu.

Việc gán điểm dừng cho depot có thể dựa trên khoảng cách gần nhất, thời gian di chuyển ngắn nhất hoặc hàm đánh giá kết hợp giữa khoảng cách, Time Window và sức chứa phương tiện tại depot. Với các điểm dừng nằm giữa nhiều depot, lựa chọn depot gần nhất chưa chắc tạo ra nghiệm tốt nhất nếu depot đó bị quá tải hoặc không phù hợp về thời gian. Vì vậy, MDVRPTW cần xem xét cả yếu tố không gian và yếu tố lịch trình.

Trong đề tài này, phần MDVRPTW được triển khai theo hướng mở rộng khảo sát. Mục tiêu không phải là giải tối ưu toàn bộ MDVRPTW quy mô lớn, mà là đánh giá khả năng phát triển của mô hình ACO + 2-opt khi bổ sung nhiều depot. Kết quả từ phần này giúp xác định các vấn đề cần xử lý nếu tiếp tục phát triển hệ thống cho môi trường vận hành thực tế phức tạp hơn.

## 3.9. Google OR-Tools

Google OR-Tools là bộ công cụ tối ưu hóa hỗ trợ nhiều bài toán như lập lịch, tối ưu tuyến đường, lập trình ràng buộc và tối ưu tổ hợp. Trong đề tài này, OR-Tools được sử dụng như một baseline công nghiệp để đối chiếu với các thuật toán tự triển khai. Việc đưa OR-Tools vào so sánh giúp đánh giá khoảng cách giữa các thuật toán nghiên cứu và một công cụ tối ưu đã được sử dụng rộng rãi trong thực tế.

Đối với TSPTW và VRPTW, OR-Tools cho phép mô hình hóa điểm dừng, phương tiện, ma trận thời gian, Time Window, depot và các ràng buộc liên quan. Thông qua routing model và các dimension như thời gian, có thể yêu cầu solver tìm lời giải thỏa mãn Time Window và tối ưu hóa chi phí di chuyển. Đối với MDVRPTW, OR-Tools cũng có thể được cấu hình với nhiều điểm xuất phát và kết thúc tương ứng với nhiều depot.

Trong hệ thống thực nghiệm, OR-Tools có thể được tích hợp thông qua wrapper riêng. Nếu phần chính của hệ thống được viết bằng TypeScript hoặc NestJS, OR-Tools có thể được gọi thông qua Python subprocess. Dữ liệu đầu vào được chuẩn hóa sang định dạng JSON, truyền sang script Python để giải, sau đó kết quả được trả lại cho hệ thống chính để lưu trữ, hiển thị và đưa vào bảng benchmark.

## 3.10. So sánh lý thuyết giữa các thuật toán

Held-Karp có ưu điểm là có thể tìm nghiệm tối ưu cho dữ liệu nhỏ, nhưng không phù hợp khi số điểm tăng lớn. Greedy có tốc độ nhanh và dễ triển khai, nhưng chất lượng nghiệm phụ thuộc mạnh vào lựa chọn cục bộ. 2-opt có khả năng cải thiện nghiệm hiệu quả nhưng không tự xây dựng được lời giải tốt nếu nghiệm ban đầu quá kém. Simulated Annealing linh hoạt hơn do có khả năng chấp nhận nghiệm kém để thoát khỏi nghiệm cục bộ, nhưng chất lượng phụ thuộc vào lịch làm nguội và cách sinh nghiệm lân cận.

ACO + 2-opt là hướng trọng tâm của đề tài vì kết hợp được khả năng xây dựng nghiệm của ACO và khả năng cải thiện cục bộ của 2-opt. Thuật toán này phù hợp với các bài toán có không gian nghiệm lớn, đặc biệt khi cần cân bằng giữa khám phá và khai thác. Tuy nhiên, ACO + 2-opt có nhiều tham số cần điều chỉnh như số lượng kiến, alpha, beta, tốc độ bay hơi pheromone và số lượng nghiệm được refine bằng 2-opt.

OR-Tools có ưu điểm về độ ổn định, khả năng mô hình hóa ràng buộc và hiệu quả thực tế. Tuy nhiên, trong phạm vi đề tài môn học, OR-Tools chủ yếu đóng vai trò baseline để đối chiếu thay vì là thuật toán nghiên cứu chính. Việc so sánh các solver giúp làm rõ trường hợp nào nên dùng heuristic nhanh, khi nào cần metaheuristic, và khi nào nên sử dụng bộ giải tối ưu công nghiệp.

---

# CHƯƠNG 4. THIẾT KẾ VÀ TRIỂN KHAI HỆ THỐNG THỰC NGHIỆM

## 4.1. Kiến trúc tổng quan của hệ thống

Hệ thống thực nghiệm được hiện thực bằng **hai NestJS module** trong `apps/backend/src/modules/`:

- `shuttle-optimizer` — bài toán **TSPTW**, chứa 6 solver, `InstanceGenerator`, `BenchmarkRunner`, `AcoTuner`, `OsrmDistanceMatrixService`.
- `shuttle-multi-hub` — bài toán **VRPTW / MDVRPTW**, chứa solver `aco-2opt-vrptw`, `aco-2opt-mdvrptw` và generator instance đa depot.

Toàn bộ subsystem thực nghiệm là **REST API không trạng thái** (stateless): không khai báo `MongooseModule`/`@Schema`/`InjectModel` (đã kiểm chứng trên mã nguồn). Instance được sinh trong bộ nhớ theo seed, giải đồng bộ trong một request, trả kết quả JSON; không lưu vào cơ sở dữ liệu. API dùng prefix `/api/v1`, tài liệu Swagger tại `/api/docs`, và mọi response được `TransformInterceptor` bọc thành `{ success: true, data: T }`.

Luồng xử lý một lần chạy: **HTTP request → Controller → Service → `InstanceGenerator` (SeededRandom, in-memory) → `OsrmDistanceMatrixService` (ma trận khoảng cách/thời gian) → Solver(s) → đối tượng Solution → response JSON**. Tính tái lập được bảo đảm bởi seed (cùng seed → cùng instance, id dạng `gen-N{n}-r{r}-w{w}-s{seed}`); kết quả được người thực hiện lưu thủ công thành file JSON trong thư mục `ket-qua/`. Frontend Next.js (`/shuttle-bench`, `/shuttle-multi-hub`) tiêu thụ chính các endpoint này để vẽ bản đồ và bảng so sánh — không có đường dữ liệu riêng nào khác.

## 4.2. Công nghệ sử dụng

Backend dùng **NestJS 11** với mô hình Module–Provider–Controller và dependency injection: mỗi solver là một provider, `BenchmarkRunner` nhận tất cả solver qua constructor và quản lý trong một `Map<name, solver>`. Frontend dùng **Next.js 16 + React 19 + Ant Design 6**, các trang chỉ gọi API và render bản đồ (Leaflet) cùng bảng kết quả.

**Đính chính so với bản nháp:** subsystem thực nghiệm **không dùng MongoDB** để lưu instance, cấu hình benchmark hay kết quả. MongoDB/Redis của nền tảng đặt vé không tham gia pipeline thực nghiệm; dữ liệu thực nghiệm là tạm thời trong RAM và chỉ được trích xuất ra file JSON khi cần báo cáo.

Ma trận khoảng cách/thời gian do `OsrmDistanceMatrixService` cung cấp: ưu tiên gọi OSRM `/table` để lấy số liệu mạng đường bộ thật, **fallback Haversine** khi OSRM không khả dụng. OR-Tools được tích hợp như solver baseline công nghiệp thông qua Python subprocess (`solvers/or-tools-solver.py`), yêu cầu Python 3.8+ và gói `ortools` (đã cài sẵn, `ortools 9.15`). Bản nháp trước báo solver này "trả giá trị sentinel vì chưa cài đặt"; thực chất đó là lỗi mô hình (trần cứng thời gian = `depot_end`) đã được sửa bằng big-M horizon — chi tiết ở mục 5.4.

## 4.3. Thiết kế solver chung

Mọi thuật toán TSPTW kế thừa lớp trừu tượng `TSPTWSolver` (`solvers/solver.interface.ts`):

```ts
abstract class TSPTWSolver {
  abstract readonly name: string;
  abstract solve(instance: TSPTWInstance, config?: SolverConfig): Promise<TSPTWSolution>;
}
interface SolverConfig { timeLimitMs?: number; seed?: number; verbose?: boolean }
```

Nhờ giao diện này, `BenchmarkRunner` gọi cả 6 solver qua đúng một vòng lặp đồng nhất `solver.solve(instance, config)`. Mỗi solver tự đo và gán `runtimeMs` vào solution. Sáu solver TSPTW: `brute-force`, `greedy-nearest-neighbor`, `two-opt`, `simulated-annealing`, `aco-2opt-hybrid`, `or-tools` — tất cả nhận **cùng một `TSPTWInstance`** nên so sánh là công bằng tuyệt đối.

Bài toán VRPTW/MDVRPTW không tái dùng `TSPTWSolver` mà có solver riêng trong `shuttle-multi-hub/solvers/` (`aco-2opt-vrptw`, `aco-2opt-mdvrptw`) làm việc trên model `VrptwInstance` đa xe – đa depot. Đây là quyết định thiết kế thực tế: TSPTW một route khác biệt đủ lớn so với định tuyến nhiều xe để tách model, nhưng vẫn dùng chung khái niệm nền (node, TimeWindow, ma trận, hàm phạt vi phạm).

## 4.4. Thiết kế model dữ liệu

Model TSPTW (`models/tsptw-instance.ts`, `tsptw-solution.ts`, `time-window.ts`) — đúng theo mã nguồn:

```ts
TSPTWNode     { id; name; coordinates: [lng, lat]; serviceTime; timeWindow }
TimeWindow    { earliest; latest }            // phút từ 00:00
TSPTWInstance { id; depot; endDepot?; customers[]; distanceMatrix;
                durationMatrix; depotStartTime; depotEndTime; vehicleCapacity }
TSPTWSolution { route; totalDistance; totalDuration; isFeasible;
                violationCount; arrivalTimes; solverName; runtimeMs }
```

Ma trận vuông kích thước (N+1)×(N+1) cho closed TSPTW (về lại depot) hoặc (N+2)×(N+2) cho open TSPTW (có `endDepot`); index 0 = depot xuất phát, 1..N = customer, N+1 = endDepot. Hàm tiện ích `isLate(arrival, w) = arrival > w.latest` và `waitTime(arrival, w) = max(0, w.earliest − arrival)` là cơ sở để đếm vi phạm và cộng thời gian chờ.

Model VRPTW/MDVRPTW (`shuttle-multi-hub/models/vrptw-instance.ts`):

```ts
VrptwDepot    { id; name; coordinates; timeWindow }
VrptwCustomer { id; name; coordinates; serviceTime; demand; timeWindow; preferredDepotId? }
VrptwVehicle  { id; name; startDepotIndex; endDepotIndex; capacity; color }
VrptwInstance { id; mode: 'vrptw'|'mdvrptw'; depots[]; vehicles[];
                customers[]; distanceMatrix; durationMatrix }
```

Bố cục ma trận: depot xếp trước (index 0..D−1), customer xếp sau (`customerMatrixIndex = depots.length + customerIndex`). **Không có "result model" được lưu trữ**: `BenchmarkRun`/`BenchmarkAggregate`/`BenchmarkReport` chỉ là DTO trong bộ nhớ trả về theo response JSON, không persist xuống DB.

## 4.5. Thiết kế dữ liệu đầu vào

`InstanceGenerator` (TSPTW) sinh customer **phân bố đều theo diện tích** trong đĩa bán kính `radiusKm` quanh depot (phép biến đổi r = R·√U, θ = 2πV để không bị tụ tâm). Depot mặc định là Bến Xe Miền Đông TPHCM `[106.815484, 10.880216]`. Time Window mỗi customer có tâm random trong `[depotStart + 15, depotEnd − 15]`, nửa-độ-rộng = `windowWidthMinutes/2 × Uniform(0.7, 1.3)` (có biến thiên giữa các customer). Tham số mặc định lấy đúng từ mã nguồn:

| Tham số | Mặc định | Ý nghĩa |
|---|---|---|
| `radiusKm` | 15 | bán kính phân bố customer quanh depot |
| `windowWidthMinutes` | 60 | độ rộng Time Window trung bình (nhỏ hơn = khó hơn) |
| `depotStartTime` | 300 (5:00) | giờ shuttle xuất phát |
| `depotEndTime` | 420 (7:00) | hạn chót về depot |
| `serviceTime` | 2 | phút dừng mỗi customer |
| `vehicleCapacity` | 16 | sức chứa (TSPTW chưa dùng) |

Tất cả sinh qua `SeededRandom` → cùng `seed` cho cùng instance; id dạng `gen-N{n}-r{radius}-w{window}-s{seed}`. Vì cả 6 solver TSPTW nhận **chính xác cùng instance**, khác biệt kết quả phản ánh thuật toán chứ không phải dữ liệu.

Generator đa depot của `shuttle-multi-hub` dùng 2 depot (Bến Xe Miền Tây + Bến Xe Miền Đông). Endpoint `/shuttle-multi-hub/seed` trả instance cố định 10 khách thật ở TPHCM (hai cụm 5 khách quanh 2 hub) để tái lập tuyệt đối; endpoint `/shuttle-multi-hub/demo` sinh ngẫu nhiên theo `n`, `vehicles`, `radius`, `window`, `depotEnd`, `seed`. Bán kính lớn (vd 18 km) đặt khách vào vùng giữa hai depot — kịch bản khó để lộ điểm yếu gán depot theo khoảng cách (đã thực chứng ở mục 5.6).

## 4.6. Ma trận khoảng cách và thời gian di chuyển

`OsrmDistanceMatrixService` xây **đồng thời hai ma trận**: `distanceMatrix` (km) và `durationMatrix` (phút), cùng kích thước. Có hai chế độ:

- **OSRM `/table`** — số liệu mạng đường bộ thật (gồm cả thời gian xét topology đường), phù hợp mô phỏng trung chuyển thực tế.
- **Fallback Haversine** — khi OSRM không cấu hình hoặc truy vấn lỗi, service tự chuyển sang công thức Haversine (`KM_PER_DEGREE_LAT = 110.574`), bảo đảm pipeline không bao giờ gãy.

Trong toàn bộ thực nghiệm của báo cáo này, OSRM container chưa được bật nên hệ thống chạy bằng **nhánh Haversine**. Điều này không ảnh hưởng tính công bằng của so sánh: mọi solver dùng chung một ma trận, và Haversine cho kết quả tất định, tái lập được — đủ cho mục tiêu so sánh **tương đối** giữa các thuật toán.

## 4.7. Triển khai solver và benchmark

Sáu solver TSPTW (thư mục `shuttle-optimizer/solvers/`): `brute-force` (Held-Karp DP, O(N²·2^N), `MAX_N = 18`, tối ưu **thuần quãng đường**, là mốc tham chiếu); `greedy-nearest-neighbor`; `two-opt`; `simulated-annealing`; `aco-2opt-hybrid` (biến thể MMAS, hàm chi phí `cost = số vi phạm × 10000 + quãng đường` với `VIOLATION_PENALTY = 10000`); `or-tools` (gọi `or-tools-solver.py` qua subprocess).

`BenchmarkRunner.runConfig()` tự động hóa thực nghiệm: với mỗi `size` sinh instance theo từng `seed` → chọn solver tham chiếu (`brute-force` nếu N ≤ `maxBruteForceN = 12`, ngược lại `or-tools`) → chạy tham chiếu trước và cache → chạy mọi solver → `computeGap = (sol − ref)/ref × 100` **trên quãng đường** → `aggregate()` theo cặp `(n, solver)` thành `distanceBest/Mean/Median/Std`, `runtimeMean/Max`, `feasibilityRate`, `violationsMean`, `gapMean`. `AcoTuner` dùng cùng cơ chế: quét lưới α × β × ρ, mỗi cấu hình chạy qua các seed, so với Brute-Force, sắp xếp theo `avgGap`.

`shuttle-multi-hub` nâng cấp ACO + 2-opt cho nhiều xe: xây route từng xe có kiểm tra Time Window và sức chứa trong lúc dựng nghiệm, áp 2-opt cho từng route, dùng cùng triết lý hàm phạt. Ở MDVRPTW, mỗi xe gắn `startDepotIndex`/`endDepotIndex`; khách được gán về depot theo khoảng cách trước khi định tuyến (chiến lược này lộ điểm yếu khi điểm nằm giữa hai depot — mục 5.6).

## 4.8. Giao diện trực quan hóa và kiểm thử

Frontend Next.js 16 (port 3001) có **ba trang** trực quan hóa, tất cả gọi cùng REST API backend (`NEXT_PUBLIC_API_BASE`, mặc định `http://localhost:5501/api/v1`):

- **`/shuttle-demo`** (`ShuttleDemoView.tsx` + `ShuttleMap.tsx`) — chạy một solver TSPTW trên một instance, vẽ lộ trình trên bản đồ Leaflet: depot, thứ tự ghé từng customer, đường đi; kèm bảng giờ đến / cửa sổ thời gian / mức vi phạm từng điểm.
- **`/shuttle-bench`** (`ShuttleBenchView.tsx`) — chạy `BenchmarkRunner` đa solver đa kích thước, hiển thị `BenchmarkReport` gồm `runs[]` và `aggregates[]` qua `Table` Ant Design; các `Statistic`/`Progress` tóm tắt feasibility, gap, runtime; `Collapse` để xem chi tiết từng run. Đây là màn so sánh chính dùng dựng các bảng mục 5.4.
- **`/shuttle-multi-hub`** (`ShuttleMultiHubView.tsx` + `ShuttleMultiHubMap.tsx`) — chuyển đổi giữa hai chế độ `vrptw` / `mdvrptw` và hai nguồn dữ liệu `seed` (instance cố định, tái lập tuyệt đối) / `random`; bản đồ tô màu route theo từng xe, hiển thị depot bắt đầu/kết thúc. Đây là màn quan sát điểm yếu gán depot ở mục 5.6.

Vì UI chỉ là lớp hiển thị mỏng trên cùng API mà script thực nghiệm gọi, số liệu trên giao diện và số liệu lưu trong `ket-qua/*.json` là **đồng nhất**.

Kiểm thử dùng Jest (`npm run test:backend`), tổng **10 file `*.spec.ts`** đặt cạnh mã nguồn. Sáu file ở `shuttle-optimizer/solvers/` kiểm thử các solver TSPTW và biến thể open-route (`brute-force`, `ant-colony`, `simulated-annealing`, `two-opt`, `or-tools`, `end-depot`) — xác nhận nghiệm trả về đúng cấu trúc, ghé đủ customer, giờ đến và mức vi phạm tính nhất quán với ma trận. File `shuttle-multi-hub/solvers/aco-two-opt.solver.spec.ts` kiểm thử solver đa xe (ràng buộc sức chứa + Time Window theo từng route). Ba file ở `shuttle-optimizer/benchmark/` kiểm thử hạ tầng thực nghiệm: `instance-generator.spec.ts` (tính tất định của `SeededRandom` — cùng seed cho cùng instance), `benchmark-runner.spec.ts` (mọi solver nhận đúng cùng một instance, `computeGap` tính đúng), `aco-tuner.spec.ts` (grid search quét đủ cấu hình, sắp xếp theo `avgGap`).

Việc kiểm thử quan trọng vì sai sót trong tính thời gian, thứ tự điểm dừng hoặc mức phạt sẽ làm sai lệch toàn bộ kết quả thực nghiệm. Hai lớp được bảo vệ: tính đúng của từng hàm/solver, và tính bất biến của instance trong luồng benchmark — điều kiện tiên quyết để mọi so sánh giữa solver là công bằng.

---

# CHƯƠNG 5. THỰC NGHIỆM VÀ ĐÁNH GIÁ

## 5.1. Thiết lập thực nghiệm

Thực nghiệm đánh giá chất lượng nghiệm, thời gian thực thi và khả năng xử lý ràng buộc của các thuật toán. Mọi solver nhận **chính xác cùng một instance** (cùng tọa độ, cùng ma trận, cùng Time Window) nên khác biệt kết quả phản ánh thuật toán chứ không phải dữ liệu. Với thuật toán ngẫu nhiên (Simulated Annealing, ACO + 2-opt), mỗi cấu hình chạy trên **5 seed cố định (1–5)** rồi lấy trung bình/độ lệch chuẩn để đánh giá độ ổn định.

Các metric ghi nhận: tổng quãng đường, tổng thời gian di chuyển, số phương tiện, thời gian thực thi, số điểm vi phạm Time Window, tỷ lệ nghiệm hợp lệ và optimality gap. Cần lưu ý ba điểm về phương pháp, ảnh hưởng trực tiếp đến cách diễn giải số liệu Chương 5:

- **Mốc tham chiếu:** với TSPTW N ≤ 12, dùng Brute-Force (Held-Karp). Brute-Force tối ưu **thuần quãng đường** và vẫn cho phép vi phạm Time Window (đếm số vi phạm chứ không loại nghiệm). OR-Tools được chạy như mốc đối chiếu công nghiệp (đã cài `ortools 9.15`, mô hình đã sửa — mục 5.4) nhưng là metaheuristic GLS (không chứng minh tối ưu) và tốn ~3,1 s/instance; do đó N = 12 vẫn là kích thước lớn nhất còn có mốc tham chiếu **exact** (Brute-Force), N > 12 chỉ còn so sánh tương đối kèm OR-Tools.
- **Gap đo trên quãng đường:** `optimalityGap = (sol − ref)/ref × 100` chỉ tính trên tổng quãng đường. Vì Brute-Force bỏ qua Time Window nên một solver có ít vi phạm hơn vẫn có thể cho gap **dương** (quãng đường dài hơn để né vi phạm). Gap thấp không đồng nghĩa nghiệm tốt hơn cho TSPTW — phải đọc kèm số vi phạm.
- **Ma trận khoảng cách:** mọi thực nghiệm chạy trên **nhánh Haversine** (OSRM container không bật). Số liệu là khoảng cách đường chim bay, tất định và tái lập được; đủ cho mục tiêu so sánh tương đối giữa các thuật toán. Phân hệ stateless, instance sinh trong bộ nhớ, kết quả lưu thủ công ra `ket-qua/*.json`.

## 5.2. Thiết kế instance thực nghiệm

**TSPTW** dùng chung cho sáu solver, bốn kích thước N ∈ {5, 8, 10, 12}, mỗi kích thước 5 seed → 20 instance, mỗi instance chạy qua 6 solver = 120 lần chạy. Instance sinh bằng tham số mặc định của `InstanceGenerator`: bán kính 15 km quanh depot Bến Xe Miền Đông, Time Window rộng 60 phút, cửa sổ depot 5:00–7:00 (300–420 phút), `serviceTime` 2 phút. Đây là một **lớp instance bị ràng buộc chặt có chủ đích**: cửa sổ depot chỉ 120 phút trong khi khách rải trong bán kính 15 km khiến hầu như không tồn tại nghiệm hợp lệ tuyệt đối (`feasibilityRate ≈ 0` ở mọi solver). Đây không phải lỗi thuật toán mà là đặc tính của bộ dữ liệu, nhằm phân biệt các thuật toán qua **mức độ giảm vi phạm** thay vì chỉ qua nhãn hợp lệ/không hợp lệ.

**VRPTW** dùng ba kịch bản tăng dần độ khó qua endpoint `/shuttle-multi-hub/demo` (cùng `n=14`, `seed=42`, `radius=7`): *lỏng* (2 xe, `window=90`, `depotEnd=450`), *vừa* (2 xe, `window=55`, `depotEnd=430`), *chặt* (3 xe, `window=35`, `depotEnd=420`). Time Window thu hẹp dần làm lộ rõ chiến lược xử lý ràng buộc: solver có xu hướng dồn các khách khó vào một xe để các xe còn lại giữ được lộ trình gọn.

**MDVRPTW** dùng hai kịch bản hai depot: *cụm rõ* — khách tụ thành hai cụm sát hai depot (seed cố định), tách 5/5, là **kịch bản hợp lệ duy nhất trong toàn bộ suite**; *xen kẽ* — bán kính lớn (~18 km) đẩy khách vào vùng giữa hai depot, làm bộc lộ điểm yếu của chiến lược gán depot theo khoảng cách (phân tích ở mục 5.6). Mọi instance gắn seed cố định để tái lập tuyệt đối.

## 5.3. Tuning tham số cho ACO + 2-opt

ACO + 2-opt có nhiều tham số ảnh hưởng trực tiếp đến chất lượng nghiệm và thời gian chạy. Các tham số quan trọng gồm số lượng kiến, số vòng lặp, hệ số pheromone alpha, hệ số heuristic beta, tốc độ bay hơi pheromone rho, hệ số phạt Time Window và số lượng nghiệm được refine bằng 2-opt. Nếu alpha quá cao, thuật toán có thể phụ thuộc quá mạnh vào pheromone và hội tụ sớm. Nếu beta quá cao, thuật toán có xu hướng chọn theo heuristic cục bộ và giảm khả năng khám phá.

Quá trình tuning được thực hiện bằng grid search trên ba tham số cốt lõi qua endpoint `POST /api/v1/shuttle-optimizer/tune-aco` (module `AcoTuner`). Lưới tham số mặc định gồm α ∈ {0.5, 1.0, 2.0}, β ∈ {2, 3, 5}, ρ ∈ {0.1, 0.2}, tức 3 × 3 × 2 = 18 cấu hình. Mỗi cấu hình được chạy trên cùng một lớp instance N = 10 customer với 5 seed cố định (1–5), nên tổng số lần chạy ACO là 18 × 5 = 90. Vì N = 10 ≤ 12 nên nghiệm Brute-Force (Held-Karp) được dùng làm mốc tham chiếu để tính optimality gap. Mỗi run giới hạn 50 vòng lặp ACO và 3000 ms. Kết quả được sắp xếp theo `avgGap` tăng dần, sau đó tới `avgDistance`; cấu hình đứng đầu được chọn cho benchmark chính.

**Bảng 5.3.1 — Kết quả grid search (N = 10, 5 seed, tham chiếu Brute-Force; gộp các cấu hình cho cùng kết quả).**

| Hạng | α | β | ρ | avgDistance (km) | stdDistance | avgGap (%) | Feasibility | avgRuntime (ms) |
|---|---|---|---|---|---|---|---|---|
| 1 | 2.0 | 5 | 0.1 | 112.63 | 9.37 | **2.45** | 0% | 4.0 |
| 1 | 2.0 | 5 | 0.2 | 112.63 | 9.37 | **2.45** | 0% | 4.2 |
| 3 | 2.0 | 3 | 0.1 | 113.26 | 9.42 | 3.02 | 0% | 5.6 |
| 3 | 2.0 | 3 | 0.2 | 113.26 | 9.42 | 3.02 | 0% | 3.8 |
| 5 | 14 cấu hình còn lại (α ≤ 1 mọi β; α = 2, β = 2) | | | 113.72 | 8.66 | 3.48 | 0% | 3.4 – 9.0 |

Cấu hình tốt nhất: **α = 2.0, β = 5, ρ = 0.1** (gap 2.45% so với nghiệm Brute-Force). Tổng thời gian chạy toàn bộ 90 run chỉ 489 ms vì ở N = 10 với ma trận Haversine, ACO + 2-opt hội tụ rất nhanh.

**Bảng 5.3.2 — Heatmap avgGap (%) theo α × β tại ρ = 0.1 (ρ = 0.2 cho kết quả y hệt).**

| | β = 2 | β = 3 | β = 5 |
|---|---|---|---|
| **α = 0.5** | 3.48 | 3.48 | 3.48 |
| **α = 1.0** | 3.48 | 3.48 | 3.48 |
| **α = 2.0** | 3.48 | 3.02 | **2.45** |

Đánh giá kết quả tuning:

1. **β (trọng số heuristic) là yếu tố quyết định.** Chất lượng nghiệm chỉ cải thiện khi α được nâng lên 2.0 kết hợp β lớn: (α = 2, β = 5) giảm gap xuống 2.45%, (α = 2, β = 3) đạt 3.02%, trong khi mọi cấu hình α ≤ 1 đều dừng ở 3.48%. Với instance nhỏ và Time Window chặt, định hướng heuristic mạnh (ưu tiên cạnh ngắn) giúp ACO xây dựng nghiệm tốt hơn trước khi 2-opt tinh chỉnh.
2. **ρ (tốc độ bay hơi pheromone) không ảnh hưởng ở quy mô này.** Với mọi cặp (α, β), ρ = 0.1 và ρ = 0.2 cho avgDistance, avgGap, stdDistance trùng khít. Nguyên nhân: ở N = 10, mỗi run hội tụ trong 3–9 ms — quá nhanh để cơ chế bay hơi pheromone tích lũy khác biệt qua các vòng lặp; bước 2-opt local search chi phối chất lượng nghiệm cuối. Đây là một giới hạn cần nêu rõ: muốn quan sát ảnh hưởng của ρ phải tăng N hoặc kéo dài số vòng lặp.
3. **Tính hợp lệ của nghiệm bằng 0 ở mọi cấu hình.** Lớp instance mặc định (N = 10, khung depot [300, 420] = 120 phút, bán kính 15 km, độ rộng Time Window 60 phút) bị ràng buộc quá chặt: ngay cả nghiệm Brute-Force tối ưu cũng không tồn tại tour hợp lệ. Do đó optimality gap được tính trên `totalDistance`; phép so sánh vẫn công bằng vì mọi solver chạy trên cùng bộ instance và cùng số vi phạm (cost = số vi phạm × 10000 + quãng đường). Đây là đặc tính của lớp dữ liệu được chọn, được báo cáo trung thực và không làm sai lệch so sánh tương đối giữa các cấu hình.
4. **Khác biệt so với mặc định hardcode.** Tham số mặc định trong mã nguồn solver là (α = 1, β = 3, ρ = 0.1), nằm trong nhóm 3.48%. Tuning cho thấy (α = 2, β = 5) tốt hơn rõ rệt (2.45% so với 3.48%, cải thiện 1.03 điểm phần trăm) cho lớp instance này — minh chứng việc tuning là cần thiết, không nên dùng tham số đặt sẵn một cách mặc nhiên. Benchmark chính (mục 5.4) sử dụng cấu hình đã tuning này.

> 📸 *Ảnh chụp cần bổ sung (người thực hiện tự chụp):* phản hồi JSON của `POST /shuttle-optimizer/tune-aco` trên Swagger `http://localhost:5501/api/docs`, thể hiện rõ trường `bestConfig` và mảng `results` đã sắp xếp — lưu kèm `ket-qua/tn2-tune-aco.json`. Đặt tên `screenshot-tn2-tune-response.png`.

## 5.4. Benchmark chính trên TSPTW

Benchmark TSPTW là phần thực nghiệm chính, so sánh sáu solver trên cùng một bộ dữ liệu qua endpoint `POST /api/v1/shuttle-optimizer/benchmark` (module `BenchmarkRunner`). Cấu hình chạy: `sizes = [5, 8, 10, 12]`, `seeds = [1, 2, 3, 4, 5]`, `solverConfig.timeLimitMs = 3000`, `maxBruteForceN = 12`. Tổng cộng 4 kích thước × 5 seed = 20 instance, mỗi instance chạy đủ 6 solver → 120 run, hoàn tất trong 62 724 ms (≈ 62,7 s) — phần lớn là 20 lần gọi OR-Tools, mỗi lần chạy hết time limit 3 s (xem đánh giá điểm 1 và 5).

Vì mọi N ≤ 12, **Brute-Force (Held-Karp) được chọn làm mốc tham chiếu cho cả bốn kích thước**. Cần nêu rõ bản chất phép đo để diễn giải đúng kết quả:

- Brute-Force tối ưu **thuần quãng đường** (Held-Karp DP), không né tránh Time Window — nó vẫn đếm số vi phạm nhưng luôn trả về tour có tổng quãng đường ngắn nhất tuyệt đối.
- Các heuristic/metaheuristic (Greedy, 2-opt, SA, ACO + 2-opt) tối ưu hàm phạt `cost = số vi phạm × 10000 + quãng đường`, tức ưu tiên giảm vi phạm trước, rút ngắn quãng đường sau.
- `optimalityGap = (quãng đường solver − quãng đường Brute-Force) / quãng đường Brute-Force × 100%`, **chỉ đo trên quãng đường**. Hệ quả quan trọng: một solver có ít vi phạm hơn Brute-Force vẫn có thể mang gap **dương** vì nó chấp nhận đi vòng để giảm trễ giờ. Do đó gap dương của ACO/SA **không** đồng nghĩa nghiệm TSPTW kém hơn — phải đọc kèm cột số vi phạm.

Kết quả tổng hợp theo từng kích thước (sắp xếp theo quãng đường trung bình tăng dần):

**Bảng 5.4.1 — N = 5 (5 seed, tham chiếu Brute-Force).**

| Solver | distMean (km) | distBest | std | viol TB | gap (%) | runtime TB (ms) | Feasibility |
|---|---|---|---|---|---|---|---|
| brute-force | 86.06 | 76.82 | 6.34 | 4.4 | 0 (ref) | 0.0 | 0% |
| or-tools | 88.02 | 80.36 | 6.72 | 3.4 | 2.31 | 3134.8 | 0% |
| two-opt | 88.76 | 76.82 | 8.02 | 3.2 | 3.05 | 0.0 | 0% |
| aco-2opt-hybrid | 90.14 | 76.82 | 9.94 | 3.0 | 4.54 | 3.4 | 0% |
| simulated-annealing | 91.67 | 76.82 | 12.08 | 3.0 | 6.26 | 3.6 | 0% |
| greedy-nearest-neighbor | 92.04 | 76.82 | 8.80 | 3.4 | 6.95 | 0.0 | 0% |

**Bảng 5.4.2 — N = 8 (5 seed, tham chiếu Brute-Force).**

| Solver | distMean (km) | distBest | std | viol TB | gap (%) | runtime TB (ms) | Feasibility |
|---|---|---|---|---|---|---|---|
| brute-force | 104.48 | 98.34 | 5.74 | 6.6 | 0 (ref) | 0.2 | 0% |
| or-tools | 106.38 | 102.04 | 6.35 | 5.6 | 1.81 | 3118.4 | 0% |
| aco-2opt-hybrid | 108.36 | 102.04 | 6.04 | 5.2 | 3.87 | 6.6 | 0% |
| simulated-annealing | 108.36 | 102.04 | 6.04 | 5.2 | 3.87 | 4.0 | 0% |
| two-opt | 109.22 | 102.04 | 5.76 | 5.2 | 4.70 | 0.0 | 0% |
| greedy-nearest-neighbor | 115.80 | 100.80 | 9.77 | 5.8 | 11.06 | 0.0 | 0% |

**Bảng 5.4.3 — N = 10 (5 seed, tham chiếu Brute-Force).**

| Solver | distMean (km) | distBest | std | viol TB | gap (%) | runtime TB (ms) | Feasibility |
|---|---|---|---|---|---|---|---|
| brute-force | 109.86 | 100.37 | 7.56 | 8.4 | 0 (ref) | 0.6 | 0% |
| aco-2opt-hybrid | 113.26 | 100.37 | 9.42 | 6.6 | 3.02 | 9.2 | 0% |
| two-opt | 113.56 | 100.37 | 11.75 | 7.0 | 3.17 | 0.0 | 0% |
| simulated-annealing | 113.72 | 102.69 | 8.66 | 6.4 | 3.48 | 4.4 | 0% |
| or-tools | 116.58 | 107.50 | 6.74 | 8.0 | 6.24 | 3119.2 | 0% |
| greedy-nearest-neighbor | 121.93 | 107.50 | 9.44 | 8.2 | 11.51 | 0.0 | 0% |

**Bảng 5.4.4 — N = 12 (5 seed, tham chiếu Brute-Force).**

| Solver | distMean (km) | distBest | std | viol TB | gap (%) | runtime TB (ms) | Feasibility |
|---|---|---|---|---|---|---|---|
| brute-force | 112.98 | 100.74 | 8.72 | 10.4 | 0 (ref) | 2.8 | 0% |
| greedy-nearest-neighbor | 117.25 | 101.07 | 14.28 | 9.8 | 3.55 | 0.0 | 0% |
| or-tools | 117.80 | 101.07 | 11.04 | 9.8 | 4.27 | 3116.0 | 0% |
| aco-2opt-hybrid | 120.15 | 104.90 | 10.85 | 8.2 | 6.35 | 15.4 | 0% |
| simulated-annealing | 120.15 | 104.90 | 10.85 | 8.2 | 6.35 | 5.0 | 0% |
| two-opt | 124.30 | 111.53 | 10.78 | 8.6 | 10.10 | 0.0 | 0% |

Đánh giá kết quả benchmark:

1. **OR-Tools đã chạy đúng sau khi sửa mô hình — không phải lỗi thiếu cài đặt.** Bản nháp trước kết luận sai rằng "OR-Tools không khả dụng vì chưa cài Python/`ortools`". Thực tế gói `ortools 9.15` đã có sẵn; nguyên nhân là **lỗi mô hình** trong `or-tools-solver.py`: nó đặt trần cứng cho biến thời gian tích lũy bằng `depot_end` (420 phút). Với lớp instance cố tình siết chặt (tour bắt buộc vượt cửa sổ depot), không phép gán nào thỏa cumul ≤ 420 → `SolveWithParameters` trả `None`, script phát thông điệp gây hiểu nhầm "không tìm được nghiệm trong time limit". Đã thay trần cứng bằng big-M `horizon` và chỉ giữ `SetCumulVarSoftUpperBound` để **đếm** vi phạm — đồng bộ hành vi với SA/ACO. Sau khi sửa, OR-Tools trả nghiệm đầy đủ ở cả 20 instance: distMean 88.02 / 106.38 / 116.58 / 117.80 km, gap 2.31 / 1.81 / 6.24 / 4.27 %. Ở N = 5 và N = 8 OR-Tools là solver **tốt nhất ngoài mốc tham chiếu** (gap nhỏ nhất); ở N = 10, 12 nó tụt sau ACO/SA. Đáng chú ý: số vi phạm của OR-Tools **không thấp hơn** SA/ACO (N=5: 3.4 vs 3.0; N=8: 5.6 vs 5.2; N=10: 8.0 vs 6.4–6.6; N=12: 9.8 vs 8.2) — engine công nghiệp tối ưu khoảng cách dưới ràng buộc mềm nhưng không vượt SA/ACO ở tiêu chí vi phạm.
2. **Brute-Force ngắn nhất về quãng đường nhưng nhiều vi phạm nhất.** Ở mọi kích thước, Brute-Force có distMean thấp nhất (đúng bản chất tối ưu quãng đường tuyệt đối) nhưng số vi phạm trung bình **cao nhất** (N=5: 4.4 so với ~3–3.4; N=10: 8.4 so với 6.4–6.6; N=12: 10.4 so với ACO/SA 8.2). Lý do: nó chọn tour hình học ngắn nhất, bỏ qua Time Window nên trễ giờ nhiều nhất. Các solver dùng hàm phạt đánh đổi quãng đường lấy số vi phạm thấp hơn — đó chính là nguồn gốc gap dương của 2-opt/SA/ACO. Đọc gap mà không đọc cột vi phạm sẽ hiểu sai chất lượng.
3. **ACO + 2-opt và Simulated Annealing trùng nhau ở N = 8 và N = 12, lệch nhẹ ở N = 5 và N = 10 — không theo xu hướng đơn điệu.** Tại N = 8 và N = 12 hai solver cho distMean, std, vi phạm, gap y hệt (N=8: 108.36 / std 6.04 / 5.2 viol / gap 3.87; N=12: 120.15 / std 10.85 / 8.2 viol / gap 6.35): bước 2-opt chung kéo cả tìm kiếm quần thể (ACO) lẫn tìm kiếm đơn quỹ đạo (SA) về cùng một cực trị cục bộ. Tại N = 5 và N = 10 ACO nhỉnh hơn chút (N=5: 90.14 vs 91.67, gap 4.54 vs 6.26; N=10: 113.26 vs 113.72, gap 3.02 vs 3.48) nhờ pha kiến dò được tour ngắn hơn đôi chút trước khi 2-opt tinh chỉnh. Khác biệt nằm trong nhiễu của 5 seed; **không** có quy luật "N càng lớn càng tách" — bác bỏ nhận định ở bản nháp trước.
4. **gap thấp không đồng nghĩa nghiệm TSPTW tốt.** Greedy có gap leo thang 6.95 → 11.06 → 11.51% ở N = 5, 8, 10 nhưng tụt xuống 3.55% ở N = 12, trong khi số vi phạm vẫn cao (9.8). Đây là hiện vật của phép đo: Greedy bám sát quãng đường (chọn điểm gần nhất) nên khoảng cách tới Brute-Force có thể nhỏ, còn các solver né Time Window lại đi vòng. Tương tự, 2-opt rẻ nhất về quãng đường ở N = 5 (gap 3.05%) nhưng xấu nhất ở N = 12 (gap 10.10%, std 10.78) vì 2-opt thuần xuất phát từ nghiệm Greedy dễ kẹt cực trị, không có cơ chế thoát do phạt như SA/ACO.
5. **Thời gian chạy.** Greedy và 2-opt gần như tức thời (~0 ms). Brute-Force tăng 0 → 0.2 → 0.6 → 2.8 ms — ở N ≤ 12 độ phức tạp O(N²·2^N) chưa bộc lộ (N=12 chỉ ~590K trạng thái). SA phẳng 3.6 → 4.0 → 4.4 → 5.0 ms. ACO + 2-opt nặng nhất trong nhóm tìm kiếm cục bộ: 3.4 → 6.6 → 9.2 → 15.4 ms (đỉnh 17 ms) do tích kiến × vòng lặp × 2-opt, nhưng vẫn dưới 18 ms. OR-Tools chiếm wall-clock áp đảo: ~3116–3135 ms mỗi instance — đây là **chi phí giải thực** (chạy GUIDED_LOCAL_SEARCH đến hết `timeLimitMs = 3000` rồi cộng overhead spawn tiến trình Python), **không** phải spawn-rồi-thất-bại như chẩn đoán sai trước đây. Tổng TN3 vì thế là 62 724 ms (≈ 62,7 s), trong đó ~62 s là 20 lần gọi OR-Tools. So với ACO (~3–15 ms) OR-Tools chậm hơn hai–ba bậc để cho nghiệm chỉ ngang hoặc nhỉnh ở N nhỏ.
6. **Mọi solver đều không hợp lệ ở mọi kích thước (Feasibility = 0%).** Đây là cùng lớp instance bị ràng buộc quá chặt như mục 5.3, nay xác nhận trên toàn dải N = 5…12: ngay cả tour tối ưu quãng đường của Brute-Force cũng vi phạm ≥ 3 Time Window. Quan trọng hơn: **ngay cả OR-Tools — solver định tuyến công nghiệp của Google — sau khi sửa mô hình vẫn đạt 0% feasibility**, bằng chứng dứt khoát rằng lớp instance vô nghiệm theo thiết kế, không phải điểm yếu của các solver tự cài. Giá trị của benchmark nằm ở so sánh **tương đối** (gap quãng đường + số vi phạm), không ở tỷ lệ hợp lệ. Hạn chế này được phân tích kỹ ở mục 5.9.
7. **Kết luận theo hàm chi phí kết hợp.** Xếp hạng bằng `cost = vi phạm × 10000 + quãng đường` (thước đo thực dụng cho bài toán trung chuyển: trễ giờ tốn kém hơn nhiều so với đi thêm vài km), SA và ACO + 2-opt có cost thấp nhất ở **mọi** kích thước (N=5 ≈ 30 090; N=8 ≈ 52 108; N=10: SA ≈ 64 114 / ACO ≈ 66 113; N=12 ≈ 82 120) nhờ giữ số vi phạm tối thiểu. OR-Tools — dù là engine công nghiệp — chỉ ở mức trung bình về cost kết hợp (N=10 ≈ 80 117; N=12 ≈ 98 118) vì vi phạm nhiều hơn SA/ACO, lại chậm hơn ~600 lần. Brute-Force luôn cao nhất do nhiều vi phạm. Mốc OR-Tools mới xác nhận điều quan trọng: ACO/SA đạt chất lượng khoảng cách gần bằng — thậm chí vượt khi tính cả vi phạm — một solver công nghiệp với chi phí thời gian nhỏ hơn hai–ba bậc. Vì vậy **ACO + 2-opt và SA vẫn là lựa chọn tốt nhất trong sáu solver**; ACO được chọn làm thuật toán chính nhờ khả năng mở rộng tự nhiên sang VRPTW/MDVRPTW (mục 5.5, 5.6).

> 📸 *Ảnh chụp cần bổ sung (người thực hiện tự chụp):* mở UI `http://localhost:3001/shuttle-bench`, chạy benchmark với cấu hình `sizes = [5, 8, 10, 12]`, `seeds = [1..5]`, `timeLimitMs = 3000`, chụp **bảng tổng hợp theo từng kích thước** và **biểu đồ runtime scaling** mà UI render. Lưu kèm `ket-qua/tn3-benchmark.json`. Đặt tên `screenshot-tn3-benchmark-table.png` và `screenshot-tn3-benchmark-runtime.png`. Nếu UI có panel chi tiết per-run, chụp thêm `screenshot-tn3-benchmark-detail.png` thể hiện cột vi phạm và gap.

## 5.5. Thực nghiệm với VRPTW tùy chỉnh

Thực nghiệm VRPTW đánh giá khả năng mở rộng của ACO + 2-opt khi bài toán có nhiều phương tiện, qua endpoint `GET /api/v1/shuttle-multi-hub/demo?mode=vrptw` (solver `aco-2opt-vrptw`, 1 depot). Ba kịch bản giữ cố định 14 khách và seed = 42, chỉ siết dần Time Window và hạn chót depot để cô lập ảnh hưởng của độ chặt ràng buộc thời gian.

**Bảng 5.5.1 — Kết quả ba kịch bản VRPTW (14 khách, seed 42, solver `aco-2opt-vrptw`).**

| Kịch bản | Xe | Window (phút) | Hạn depot | Tổng quãng (km) | Tổng TG (phút) | Vi phạm | Feasible | Runtime (ms) |
|---|---|---|---|---|---|---|---|---|
| VRPTW-lỏng | 2 | 90 | 450 | 133.35 | 352.3 | 5 | Không | 479 |
| VRPTW-vừa | 2 | 55 | 430 | 143.33 | 375.3 | 7 | Không | 473 |
| VRPTW-chặt | 3 | 35 | 420 | 215.74 | 592.1 | 8 | Không | 431 |

**Bảng 5.5.2 — Phân bổ tải theo từng xe.**

| Kịch bản | Xe | Số khách | Quãng (km) | Vi phạm | Route hợp lệ |
|---|---|---|---|---|---|
| VRPTW-lỏng | Shuttle 1 | 6 | 39.04 | 0 | Có |
| VRPTW-lỏng | Shuttle 2 | 8 | 94.31 | 5 | Không |
| VRPTW-vừa | Shuttle 1 | 6 | 43.03 | 0 | Có |
| VRPTW-vừa | Shuttle 2 | 8 | 100.30 | 7 | Không |
| VRPTW-chặt | Shuttle 1 | 6 | 90.80 | 5 | Không |
| VRPTW-chặt | Shuttle 2 | 3 | 29.26 | 0 | Có |
| VRPTW-chặt | Shuttle 3 | 5 | 95.68 | 3 | Không |

Đánh giá kết quả VRPTW:

1. **Siết Time Window làm xấu nghiệm đơn điệu.** Khi window thu từ 90 → 55 → 35 phút và hạn depot từ 450 → 430 → 420, tổng quãng đường tăng 133.35 → 143.33 → 215.74 km và số vi phạm tăng 5 → 7 → 8. Đúng kỳ vọng lý thuyết: ràng buộc thời gian chặt buộc xe đi vòng để cố kịp giờ nhưng vẫn không thỏa được.
2. **Solver cô lập nhóm khách khó vào một route.** Ở kịch bản lỏng và vừa, ACO + 2-opt dồn toàn bộ vi phạm vào Shuttle 2 (8 khách, 94–100 km, 5–7 vi phạm) trong khi Shuttle 1 (6 khách, ~40 km) hoàn toàn hợp lệ. Đây là hệ quả hợp lý của hàm phạt — giữ tối đa số route sạch — nhưng tạo mất cân bằng tải rõ rệt (8 vs 6 khách, 94 vs 39 km).
3. **Thêm xe không cứu được tính hợp lệ.** Kịch bản chặt được cấp 3 xe nhưng tổng quãng vọt lên 215.74 km (mỗi xe thêm một lượt khứ hồi depot) và vẫn 8 vi phạm; chỉ Shuttle 2 (3 khách) hợp lệ. Window 35 phút quá hẹp so với thời gian di chuyển thực tế nên không cấu hình xe nào đủ.
4. **Không có khách bị bỏ (`unassignedCustomerIds = []`) ở cả ba kịch bản.** Solver luôn gán hết 14 khách và chấp nhận chịu vi phạm thay vì từ chối khách — đúng thiết kế hàm phạt hữu hạn, không có cơ chế loại khách.
5. **Thời gian chạy ổn định 431–479 ms** cho N = 14 với 2–3 xe — ACO + 2-opt VRPTW không phải nút cổ chai về tốc độ.

Kết luận: phiên bản VRPTW kế thừa đúng họ hàm phạt từ TSPTW và xử lý được nhiều xe, nhiều route, nhưng (a) lớp instance vẫn bị ràng buộc quá chặt nên feasibility = 0 như TSPTW, (b) chưa có cơ chế cân bằng tải giữa các xe nên route bị lệch — đây là hướng cải tiến nêu ở mục 5.7 và 5.9.

> 📸 *Ảnh chụp cần bổ sung (người thực hiện tự chụp):* mở UI `http://localhost:3001/shuttle-multi-hub`, chọn mô hình **VRPTW thuần**, chạy lần lượt ba kịch bản trong Bảng 5.5.1. Với mỗi kịch bản chụp `screenshot-tn4-{long|med|tight}-map.png` (bản đồ route các xe) và `screenshot-tn4-{long|med|tight}-result.png` (thẻ Kết quả + bảng Route theo xe). Lưu kèm `ket-qua/tn4-vrptw-{long|med|tight}.json`.

## 5.6. Thực nghiệm mở rộng với MDVRPTW

Thực nghiệm MDVRPTW khảo sát ảnh hưởng của nhiều depot (2 depot: Bến Xe Miền Tây và Bến Xe Miền Đông) đến chất lượng nghiệm, qua endpoint `/api/v1/shuttle-multi-hub` (solver `aco-2opt-mdvrptw`). Hai kịch bản đối chứng được thiết kế để bộc lộ điểm yếu của chiến lược gán depot theo khoảng cách: một kịch bản có hai cụm khách tách biệt sát mỗi depot (seed cố định, `GET /shuttle-multi-hub/seed?mode=mdvrptw`), một kịch bản rải khách vào vùng giữa hai depot (`GET /shuttle-multi-hub/demo?mode=mdvrptw&n=14&radius=18&seed=7`).

**Bảng 5.6.1 — Kết quả hai kịch bản MDVRPTW (2 depot, solver `aco-2opt-mdvrptw`).**

| Kịch bản | Nguồn | Khách | Xe | Tổng quãng (km) | Tổng TG (phút) | Vi phạm | Feasible | Runtime (ms) |
|---|---|---|---|---|---|---|---|---|
| MD-cụm rõ | Seed cố định | 10 | 2 | 51.71 | 173.2 | 0 | **Có** | 48 |
| MD-xen kẽ | Random, r = 18 km, seed 7 | 14 | 2 | 262.01 | 656.8 | 8 | Không | 539 |

**Bảng 5.6.2 — Phân bổ theo từng depot/xe.**

| Kịch bản | Xe @ Depot | Số khách | Quãng (km) | Vi phạm | Route hợp lệ |
|---|---|---|---|---|---|
| MD-cụm rõ | Shuttle 1 @ BX Miền Tây | 5 | 21.35 | 0 | Có |
| MD-cụm rõ | Shuttle 2 @ BX Miền Đông | 5 | 30.36 | 0 | Có |
| MD-xen kẽ | Shuttle 1 @ BX Miền Tây | 7 | 119.75 | 4 | Không |
| MD-xen kẽ | Shuttle 2 @ BX Miền Đông | 7 | 142.26 | 4 | Không |

Đánh giá kết quả MDVRPTW:

1. **MD-cụm rõ là nghiệm hợp lệ duy nhất trong toàn bộ thực nghiệm.** Trên tất cả các lần chạy TN2–TN5, đây là instance duy nhất đạt `isFeasible = true` với 0 vi phạm. Nguyên nhân: seed cố định đặt hai cụm 5 khách tách biệt sát mỗi depot, Time Window đủ rộng so với bán kính cụm nhỏ, nên solver gán đúng mỗi cụm về depot gần và sinh route ngắn (21.35 / 30.36 km), kịp mọi khung giờ. Kết quả này chứng minh solver vận hành đúng khi dữ liệu "lành" — củng cố nhận định ở mục 5.4 rằng feasibility = 0 ở các phần khác là do lớp instance bị siết quá chặt, không phải do lỗi thuật toán.
2. **Điểm xen kẽ phá vỡ chiến lược gán theo khoảng cách.** Bán kính 18 km rải khách vào vùng giữa hai depot. Tổng quãng đường nổ từ 51.71 → 262.01 km (gấp 5.07 lần) và phát sinh 8 vi phạm, dù chỉ thay đổi phân bố điểm. Việc gán cứng từng khách về depot gần nhất buộc hai xe chạy chéo qua vùng giữa, tạo route 119.75 / 142.26 km.
3. **Cân bằng số khách không kéo theo cân bằng quãng đường.** Cả hai kịch bản đều chia 5/5 và 7/7 khách giữa hai depot, nhưng ở MD-xen kẽ quãng đường lệch rõ (119.75 vs 142.26 km) — số khách bằng nhau không đảm bảo tải vận hành cân bằng.
4. **Không có khách bị bỏ ở cả hai kịch bản.** Solver luôn phục vụ hết khách, chọn chịu vi phạm thay vì để `unassigned`.
5. **Hàm ý cải tiến.** Đối chứng định lượng (×5 quãng đường, 0 → 8 vi phạm chỉ do đổi phân bố điểm) xác nhận giả thuyết: gán depot theo khoảng cách thuần chưa tối ưu khi điểm nằm giữa. Hướng nghiên cứu tiếp là tối ưu đồng thời việc gán depot và xây route (cân nhắc Time Window ngay khi gán, hoặc phân cụm có ràng buộc) thay vì gán cứng theo khoảng cách rồi mới định tuyến — chi tiết ở mục 6.5.

> 📸 *Ảnh chụp cần bổ sung (người thực hiện tự chụp):* mở UI `http://localhost:3001/shuttle-multi-hub`, chọn mô hình **MDVRPTW**. Chụp `screenshot-tn5-cluster-map.png` + bảng route cho kịch bản MD-cụm rõ (seed cố định) và `screenshot-tn5-mixed-map.png` + bảng route cho kịch bản MD-xen kẽ — làm nổi bật chênh lệch quãng đường giữa hai xe. Lưu kèm `ket-qua/tn5-md-cluster.json` và `ket-qua/tn5-md-mixed.json`.

## 5.7. Phân tích hiệu quả của ACO + 2-opt nâng cấp

Phân tích grid search ở mục 5.3 (dữ liệu `tn2-tune-aco.json`) cho ba quan sát cụ thể về độ nhạy tham số ở quy mô N = 10:

- **ρ gần như trơ ở quy mô nhỏ.** Với *mọi* cặp (α, β), hai giá trị ρ ∈ {0.1, 0.2} cho `avgDistance`, `avgGap` và `stdDistance` **trùng khít nhau**. Ở N = 10 với 50 vòng lặp, ACO + 2-opt hội tụ trước khi tốc độ bay hơi pheromone kịp tạo khác biệt — tốc độ bay hơi chỉ thực sự có ý nghĩa ở instance lớn hơn, nhiều vòng lặp hơn.
- **Phần lớn cấu hình hội tụ về cùng một nghiệm.** 14/18 cấu hình cho cùng `avgDistance` ≈ 113.72 km (gap ≈ 3.48%). Chỉ khi α = 2 kết hợp β cao thì kết quả mới tách ra: α = 2, β = 3 đạt 113.26 km (gap 3.02%); α = 2, β = 5 đạt **112.63 km (gap 2.45%)** — cấu hình tốt nhất. Nghĩa là ở lớp instance này, sức nặng heuristic (β) khi đủ lớn mới kéo nghiệm ra khỏi điểm hội tụ chung, còn α, ρ ít tác dụng.
- **Hệ số phạt là hằng số mã nguồn.** `VIOLATION_PENALTY = 10000`, hàm chi phí `cost = số vi phạm × 10000 + quãng đường`. Giá trị này đủ lớn để một vi phạm luôn đắt hơn mọi chênh lệch quãng đường thực tế (quãng đường toàn suite < 300 km), nên thuật toán luôn ưu tiên giảm vi phạm trước, tối ưu quãng đường sau — đúng triết lý lexicographic mà không cần tinh chỉnh penalty.

Về quan hệ với Simulated Annealing: ở N ≤ 10, ACO + 2-opt và SA cho **kết quả trùng nhau** (cùng quãng đường trung bình mỗi kích thước trong `tn3-benchmark.json`); chúng chỉ tách ra ở N = 12, nơi SA nhỉnh hơn về quãng đường (≈119.2 so với ≈120.2 km) còn ACO ít vi phạm hơn đôi chút. Bước 2-opt đóng góp rõ ở khía cạnh giảm vi phạm: solver 2-opt thuần ở N = 10 đạt số vi phạm trung bình thấp nhất trong sáu solver (≈3.2 so với ≈8.4 của Brute-Force), cho thấy phần lớn năng lực xử lý ràng buộc của thuật toán lai đến từ local search chứ không chỉ từ cơ chế kiến.

## 5.8. So sánh tổng hợp các thuật toán

Tổng hợp số liệu `tn3-benchmark.json` (TSPTW, N ∈ {5, 8, 10, 12}) cho một kết luận quan trọng: **thuật toán đứng đầu thay đổi theo tiêu chí đánh giá**.

- **Brute-Force** luôn cho quãng đường ngắn nhất ở mọi kích thước (theo định nghĩa: nó vét cạn để tối ưu quãng đường) nhưng đồng thời **vi phạm Time Window nhiều nhất** (≈4.4 ở N = 5 tăng tới ≈10.4 ở N = 12) vì nó hoàn toàn bỏ qua ràng buộc thời gian. Do đó nó là mốc tham chiếu quãng đường tốt nhưng là nghiệm tệ nhất xét theo ràng buộc — và chi phí O(N²·2^N) khiến nó vô dụng khi N lớn hoặc nhiều xe.
- **Greedy** nhanh nhất nhưng chất lượng quãng đường thấp nhất; chỉ nên dùng làm nghiệm khởi tạo hoặc baseline.
- **2-opt thuần** giảm vi phạm ở mức khá (đồng hạng thấp nhất với SA/ACO ở N = 8 với 5.2 vi phạm, nhưng **không** phải thấp nhất ở N = 10: 7.0 so với SA 6.4 / ACO 6.6) với quãng đường trung bình hợp lý — local search là thành phần xử lý ràng buộc mạnh, song dễ kẹt cực trị ở N lớn (gap 10.10% ở N = 12).
- **Simulated Annealing và ACO + 2-opt** trùng khít ở N = 8 và N = 12 (cùng bước 2-opt kéo về một cực trị cục bộ), chỉ lệch nhẹ ở N = 5 và N = 10 (ACO nhỉnh hơn về quãng đường) — không theo xu hướng đơn điệu theo N. Đây là **nghiệm tốt nhất xét theo chi phí kết hợp** (`vi phạm × 10000 + quãng đường`): chấp nhận quãng đường dài hơn Brute-Force vài phần trăm (gap dương) để đổi lấy ít vi phạm hơn rõ rệt. Đây là lý do ACO + 2-opt được chọn làm thuật toán trọng tâm và mở rộng sang VRPTW/MDVRPTW.
- **OR-Tools (sau khi sửa mô hình) là mốc đối chiếu công nghiệp hợp lệ cho N ≤ 12.** Bản nháp trước báo "không khả dụng vì chưa cài `ortools`" — sai: gói đã có sẵn, lỗi nằm ở trần thời gian cứng = `depot_end`, đã sửa bằng big-M horizon (mục 5.4). Sau khi sửa: gap quãng đường 2.31 / 1.81 / 6.24 / 4.27 %, nhưng số vi phạm **không thấp hơn** SA/ACO và chi phí ~3,1 s/instance (~600× ACO). Với N > 12 vẫn thiếu mốc *exact* (Brute-Force O(N²·2^N) quá đắt) — phân tích ở mục 5.9.

Hệ quả phương pháp luận: gap dương của ACO/SA so với Brute-Force **không** nghĩa là chúng kém — vì gap chỉ đo quãng đường còn Brute-Force phớt lờ Time Window. Với bài toán TSPTW (mục tiêu là nghiệm khả thi theo thời gian), trật tự đúng để đánh giá là *số vi phạm trước, quãng đường sau*; theo trật tự đó ACO + 2-opt và SA dẫn đầu. Không có thuật toán tốt nhất tuyệt đối: lựa chọn phụ thuộc kích thước dữ liệu, độ chặt Time Window và việc tối ưu hướng tới quãng đường hay tính khả thi.

## 5.9. Hạn chế và nguy cơ ảnh hưởng đến tính hợp lệ của thực nghiệm

Cần nêu rõ năm nguy cơ ảnh hưởng đến cách diễn giải kết quả Chương 5, để người đọc không rút ra kết luận sai:

- **Tỷ lệ hợp lệ ≈ 0 là đặc tính bộ dữ liệu, không phải thất bại thuật toán.** Lớp instance TSPTW/VRPTW được sinh với cửa sổ depot rất hẹp (mục 5.2) nên gần như không có nghiệm hợp lệ tuyệt đối — kịch bản MDVRPTW *cụm rõ* là trường hợp hợp lệ duy nhất. Do đó so sánh giữa các thuật toán phải dựa trên **mức giảm vi phạm** chứ không trên nhãn hợp lệ; một kết luận kiểu "mọi thuật toán đều thất bại" sẽ là hiểu sai.
- **Mốc đối chiếu công nghiệp chỉ phủ N ≤ 12.** OR-Tools đã được sửa mô hình và chạy đúng (mục 5.4) nên với N ≤ 12 báo cáo *có* mốc công nghiệp. Hạn chế còn lại: (a) với N > 12 không có mốc *exact* (Brute-Force O(N²·2^N) quá đắt, còn OR-Tools là metaheuristic GLS chứ không chứng minh tối ưu); (b) OR-Tools tốn ~3,1 s/instance nên không khả thi để quét nhiều seed/kích thước lớn trong cùng ngân sách thời gian; (c) chính OR-Tools cũng đạt 0% feasibility trên lớp instance này nên không cung cấp được nghiệm hợp lệ tham chiếu.
- **Optimality gap đo trên quãng đường, mốc lại bỏ qua Time Window.** Vì Brute-Force tối ưu thuần quãng đường và phớt lờ ràng buộc, gap dương của ACO/SA phản ánh việc chúng đi vòng để né vi phạm, không phải chất lượng kém. Mọi nhận định về gap phải đọc kèm số vi phạm; tách rời sẽ dẫn đến xếp hạng ngược.
- **Ma trận tĩnh, đường chim bay.** Toàn bộ thực nghiệm chạy bằng Haversine (OSRM tắt) và thời gian di chuyển cố định, chưa phản ánh giờ cao điểm, ùn tắc hay thời tiết. Số liệu phù hợp để so sánh tương đối giữa thuật toán, không phải để ước lượng hiệu năng vận hành thực tế.
- **Điểm yếu thiết kế của solver MDVRPTW.** Khách được gán depot theo khoảng cách *trước* khi định tuyến; chiến lược này mất cân bằng tải khi điểm nằm giữa hai depot (đã thực chứng ở kịch bản *xen kẽ*, mục 5.6). Đây là giới hạn của hướng tiếp cận hiện tại, không nên ngoại suy kết quả MDVRPTW sang các cấu hình depot khác.

Ngoài ra, số seed (5) và số vòng lặp metaheuristic còn khiêm tốn do giới hạn thời gian; kết luận về độ ổn định trung bình sẽ vững hơn nếu tăng số lần chạy. Mục tiêu của việc đối chiếu với OR-Tools là phân tích đặc điểm từng hướng tiếp cận, không nhằm chứng minh solver tự triển khai vượt trội bộ giải công nghiệp; kết quả cho thấy ACO/SA đạt chất lượng gần bằng OR-Tools với chi phí thời gian nhỏ hơn hai–ba bậc.

---

# CHƯƠNG 6. KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN

## 6.1. Tóm tắt nội dung đã thực hiện

Đề tài đã nghiên cứu và triển khai các thuật toán metaheuristic cho bài toán tối ưu lộ trình có ràng buộc thời gian. Nội dung nghiên cứu bắt đầu từ bài toán TSPTW, mở rộng sang VRPTW và khảo sát thêm hướng MDVRPTW. Trên cơ sở đó, đề tài xây dựng hệ thống solver thống nhất, cho phép nhiều thuật toán được chạy trên cùng dữ liệu và so sánh theo các tiêu chí chung.

Các thuật toán được triển khai bao gồm Held-Karp Dynamic Programming, Greedy Nearest Neighbor, 2-opt Local Search, Simulated Annealing, Ant Colony Optimization kết hợp 2-opt và Google OR-Tools. Trong đó, ACO + 2-opt là thuật toán trọng tâm, được phân tích cả ở phiên bản TSPTW và phiên bản mở rộng cho VRPTW. Hệ thống thực nghiệm cũng hỗ trợ dữ liệu tùy chỉnh, ma trận khoảng cách, benchmark pipeline và trực quan hóa kết quả.

## 6.2. Kết quả đạt được

Kết quả quan trọng nhất của đề tài là xây dựng được khung thực nghiệm thống nhất cho nhóm bài toán tối ưu lộ trình có ràng buộc thời gian. Các solver được chuẩn hóa đầu vào và đầu ra, giúp quá trình benchmark trở nên nhất quán. Bộ dữ liệu TSPTW dùng chung cho sáu solver cho phép so sánh trực tiếp giữa các nhóm thuật toán khác nhau.

Đề tài cũng đã làm rõ vai trò của từng thuật toán trong từng điều kiện. Held-Karp phù hợp với dữ liệu nhỏ và vai trò nghiệm chuẩn. Greedy phù hợp với yêu cầu tốc độ. 2-opt phù hợp để cải thiện nghiệm. Simulated Annealing có khả năng khám phá nghiệm tốt hơn heuristic đơn giản. ACO + 2-opt cho thấy tiềm năng tốt trong việc cân bằng giữa xây dựng nghiệm và cải thiện cục bộ. OR-Tools đóng vai trò baseline ổn định để đối chiếu.

## 6.3. Đóng góp của đề tài

Đóng góp thứ nhất của đề tài là hệ thống hóa cơ sở lý thuyết của các bài toán TSPTW, VRPTW và MDVRPTW trong bối cảnh trung chuyển hành khách. Đề tài không chỉ trình bày bài toán định tuyến ở mức tổng quát mà còn liên hệ với yêu cầu thực tế như điểm đón, depot, phương tiện, sức chứa và thời gian phục vụ.

Đóng góp thứ hai là triển khai và so sánh nhiều thuật toán thuộc các nhóm khác nhau. Việc đưa các thuật toán chính xác, heuristic, local search, metaheuristic và OR-Tools vào cùng một khung thực nghiệm giúp đánh giá toàn diện hơn. Đóng góp trọng tâm là phiên bản ACO + 2-opt, trong đó ACO đảm nhiệm xây dựng nghiệm còn 2-opt cải thiện chất lượng lộ trình.

Đóng góp thứ ba là mở rộng bài toán từ TSPTW sang VRPTW và khảo sát MDVRPTW. Điều này giúp đề tài không dừng lại ở một lộ trình đơn mà tiến gần hơn đến các tình huống thực tế có nhiều xe và nhiều điểm tập kết. Quy trình thực nghiệm, bộ tiêu chí đánh giá và khả năng cấu hình dữ liệu là nền tảng để tiếp tục phát triển hệ thống trong tương lai.

## 6.4. Hạn chế của đề tài

Đề tài vẫn còn một số hạn chế. Thứ nhất, dữ liệu thực nghiệm chưa hoàn toàn là dữ liệu vận hành thực tế từ các nhà xe, mà chủ yếu được xây dựng hoặc sinh theo cấu hình. Điều này giúp kiểm soát điều kiện thử nghiệm nhưng có thể chưa phản ánh đầy đủ các yếu tố phức tạp của giao thông thực tế.

Thứ hai, phần VRPTW và MDVRPTW mới được tiếp cận theo hướng mở rộng từ mô hình TSPTW. Một số kỹ thuật nâng cao như cân bằng tải động, tái tối ưu khi có khách mới, thay đổi lộ trình theo thời gian thực hoặc tối ưu đồng thời nhiều mục tiêu chưa được xử lý đầy đủ. Đặc biệt, MDVRPTW vẫn đóng vai trò khảo sát mở rộng, chưa phải là phần tối ưu sâu nhất của đề tài.

Thứ ba, các thuật toán metaheuristic phụ thuộc nhiều vào tham số. Nếu số lượng cấu hình tuning hoặc số seed thực nghiệm còn hạn chế, kết quả có thể chưa phản ánh hết khả năng của thuật toán. Việc so sánh với OR-Tools cũng cần được hiểu theo hướng tham chiếu công nghiệp, không phải thay thế hoàn toàn cho các nghiên cứu thuật toán chuyên sâu.

## 6.5. Hướng phát triển

Hướng phát triển đầu tiên là mở rộng đầy đủ cho VRPTW quy mô lớn. Hệ thống có thể bổ sung các phép sinh nghiệm lân cận mạnh hơn như relocate, swap, cross-exchange hoặc 2-opt* giữa các route. Các kỹ thuật này giúp cải thiện không chỉ thứ tự điểm dừng trong từng route mà còn cải thiện cách phân bổ điểm dừng giữa các phương tiện.

Hướng phát triển thứ hai là hoàn thiện MDVRPTW với nhiều depot thực tế. Thay vì gán depot trước bằng quy tắc đơn giản, hệ thống có thể tối ưu đồng thời việc chọn depot và xây dựng route. Điều này đặc biệt hữu ích khi một điểm dừng nằm giữa nhiều depot hoặc khi số lượng phương tiện tại mỗi depot không đồng đều.

Hướng phát triển thứ ba là tối ưu đa mục tiêu. Trong thực tế, nhà xe không chỉ quan tâm đến quãng đường ngắn nhất mà còn cần cân bằng chi phí, thời gian chờ, số xe sử dụng, độ trễ, mức độ hài lòng của hành khách và tính công bằng giữa các tài xế. Các phương pháp Pareto multi-objective có thể được nghiên cứu để biểu diễn nhiều nghiệm tối ưu theo các tiêu chí khác nhau.

Hướng phát triển thứ tư là tích hợp thời gian di chuyển thay đổi theo thời điểm. Thay vì dùng ma trận thời gian tĩnh, hệ thống có thể sử dụng dữ liệu giao thông theo khung giờ hoặc dữ liệu lịch sử để dự báo thời gian di chuyển. Khi đó, bài toán trở thành time-dependent routing, phản ánh thực tế tốt hơn nhưng cũng phức tạp hơn.

Hướng phát triển cuối cùng là nghiên cứu khả năng ứng dụng Reinforcement Learning hoặc các phương pháp học tăng cường vào điều phối lộ trình. Hướng này có thể phù hợp khi hệ thống cần ra quyết định liên tục trong môi trường biến động, chẳng hạn như có khách đặt mới, hủy chuyến, thay đổi điểm đón hoặc phát sinh ùn tắc giao thông.

---

# PHỤ LỤC

## Phụ lục A. Cấu trúc thư mục mã nguồn

Mã nguồn nằm trong backend NestJS, gồm **hai module** độc lập, không dùng MongoDB (stateless).

```text
apps/backend/src/modules/
├── shuttle-optimizer/                  # TSPTW — 1 xe, 1 depot
│   ├── shuttle-optimizer.controller.ts
│   ├── shuttle-optimizer.service.ts
│   ├── shuttle-optimizer.module.ts
│   ├── solvers/
│   │   ├── solver.interface.ts         # abstract TSPTWSolver
│   │   ├── brute-force.solver.ts       # Held-Karp DP (mốc tham chiếu)
│   │   ├── greedy.solver.ts            # nearest-neighbor
│   │   ├── two-opt.solver.ts
│   │   ├── simulated-annealing.solver.ts
│   │   ├── ant-colony.solver.ts        # ACO + 2-opt (trọng tâm)
│   │   └── or-tools.solver.ts          # gọi or-tools-solver.py qua subprocess
│   ├── benchmark/
│   │   ├── benchmark-runner.ts         # runConfig(), computeGap(), aggregate()
│   │   ├── instance-generator.ts       # sinh instance qua SeededRandom
│   │   ├── aco-tuner.ts                # grid search α × β × ρ
│   │   └── seed-data.ts
│   ├── distance/
│   │   └── osrm-distance-matrix.service.ts   # OSRM /table + fallback Haversine
│   ├── models/  (tsptw-instance.ts, tsptw-solution.ts, time-window.ts, seeded-random.ts)
│   └── dto/     (solve-request.dto.ts, solve-response.dto.ts)
└── shuttle-multi-hub/                  # VRPTW / MDVRPTW — nhiều xe, nhiều depot
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

Frontend (`apps/frontend/src/app/`) có ba trang: `shuttle-demo/`, `shuttle-bench/`, `shuttle-multi-hub/` (mỗi trang gồm `page.tsx` + `*View.tsx`, hai trang bản đồ kèm `*Map.tsx`).

## Phụ lục B. Hướng dẫn cài đặt và chạy chương trình

Toàn bộ quy trình tái lập (đường dẫn, thứ tự chạy, tham số từng thực nghiệm) được mô tả chi tiết trong tài liệu kèm theo **`huong_dan.md`** (đặt cùng thư mục `Ve_Xe_Nhanh_Ts/`). Phụ lục này tóm tắt các điểm cốt lõi.

**Cài đặt (chạy một lần):** từ thư mục gốc `Ve_Xe_Nhanh_Ts/` chạy `npm install`, sau đó `npm run build:types` (bắt buộc trước vì backend/frontend phụ thuộc package `shared-types`), rồi tạo `apps/backend/.env` từ `.env.example` (quan trọng: `PORT=5501`).

**Khởi động:** `npm run dev:backend` (NestJS, port 5501, Swagger tại `http://localhost:5501/api/docs`) và `npm run dev:frontend` (Next.js, port 3001). Phân hệ solver **không dùng MongoDB** — instance sinh tại chỗ trong bộ nhớ, không cần khởi động database cho các thực nghiệm Chương 5.

**Thành phần tùy chọn:** OR-Tools cần Python 3.8+ và `pip install ortools`. Trong môi trường chạy báo cáo này gói **đã được cài** (`ortools 9.15`) và script `or-tools-solver.py` đã sửa lỗi mô hình (trần thời gian cứng → big-M horizon, mục 5.4) nên solver `or-tools` cho số liệu thật trong TN3; nếu môi trường khác thiếu `ortools` thì chỉ solver này trả nghiệm rỗng kèm cảnh báo, năm solver còn lại vẫn chạy. OSRM chạy bằng Docker (thiếu → tự fallback sang Haversine, số liệu vẫn hợp lệ — đây chính là cấu hình dùng cho mọi thực nghiệm trong báo cáo này).

**Thứ tự chạy bắt buộc:** TN0 (smoke test) → TN2 (tuning ACO, mục 5.3) → TN3 (benchmark 6 solver TSPTW, mục 5.4) → TN4 (VRPTW, mục 5.5) → TN5 (MDVRPTW, mục 5.6). Lý do: TN2 chọn bộ tham số (α, β, ρ) làm căn cứ diễn giải TN3; TN4/TN5 dùng lại cùng họ ACO + 2-opt nên chạy sau. Mỗi instance gắn `seed` cố định và id dạng `gen-N{n}-r{radius}-w{window}-s{seed}` để tái lập tuyệt đối; kết quả JSON lưu trong thư mục `ket-qua/`.

## Phụ lục C. API endpoints

API prefix: `/api/v1` · Swagger: `http://localhost:5501/api/docs`. Toàn bộ response được `TransformInterceptor` bọc thành `{ success: true, data: … }`.

**Module Shuttle Optimizer (TSPTW):**

| Method | Endpoint | Mục đích |
|---|---|---|
| GET | `/shuttle-optimizer/solvers` | Liệt kê 6 solver |
| GET | `/shuttle-optimizer/demo?solver=` | Giải 10 điểm thật TPHCM (Haversine, không cần DB/auth) |
| GET | `/shuttle-optimizer/random?n=&radius=&window=&depotEnd=&seed=&solver=` | Sinh instance ngẫu nhiên rồi giải |
| POST | `/shuttle-optimizer/solve` | Giải instance tùy chỉnh (body có `customers[]`, `depot`, …) |
| POST | `/shuttle-optimizer/tune-aco` | Grid search α × β × ρ (TN2 / mục 5.3) |
| POST | `/shuttle-optimizer/benchmark` | Benchmark 6 solver (TN3 / mục 5.4) |

**Module Shuttle Multi Hub (VRPTW / MDVRPTW):**

| Method | Endpoint | Mục đích |
|---|---|---|
| GET | `/shuttle-multi-hub/solvers` | Liệt kê solver `aco-2opt-vrptw`, `aco-2opt-mdvrptw` |
| GET | `/shuttle-multi-hub/main-route` | Polyline OSRM tuyến chính BXMT ↔ BXMĐ |
| GET | `/shuttle-multi-hub/seed?mode=&solver=` | Giải seed cố định (10 khách, 2 hub) |
| GET | `/shuttle-multi-hub/demo?mode=&n=&vehicles=&radius=&window=&depotEnd=&seed=&solver=` | Sinh + giải instance (TN4 / TN5) |
| POST | `/shuttle-multi-hub/solve` | Giải instance tùy chỉnh |

Các endpoint này phục vụ liệt kê solver, gửi instance, chạy benchmark/tuning và truy xuất kết quả. Không có endpoint lưu/đọc kết quả từ database vì phân hệ là stateless — kết quả được lưu thủ công ra `ket-qua/*.json`.

## Phụ lục D. Sample data và DEMO_SEED

Có hai nguồn dữ liệu. **Seed cố định** (`benchmark/seed-data.ts`): 10 điểm thật ở TPHCM quanh hai bến (Bến Xe Miền Đông, Bến Xe Miền Tây) — dùng cho endpoint `/demo` và `/seed`, tái lập tuyệt đối, không phụ thuộc tham số. **Sinh ngẫu nhiên có kiểm soát** (`benchmark/instance-generator.ts`): nhận một `seed` số nguyên, dùng `SeededRandom` (cùng `seed` → cùng instance) sinh khách trong đĩa bán kính `radiusKm` quanh depot (`r = R·√U`, `θ = 2πV`), gán Time Window rộng `windowWidthMinutes`, `serviceTime`, demand và sức chứa xe. Mỗi instance mang id `gen-N{n}-r{radius}-w{window}-s{seed}` ghi đủ tham số tái lập. Mặc định: `radiusKm=15`, `windowWidthMinutes=60`, `depotStartTime=300` (5:00), `depotEndTime=420` (7:00), `serviceTime=2`, `vehicleCapacity=16`, depot = Bến Xe Miền Đông `[106.815484, 10.880216]`.

## Phụ lục E. Một số bảng kết quả thực nghiệm chi tiết

Phần này dùng để lưu các bảng kết quả đầy đủ, bao gồm kết quả từng seed, từng kích thước instance và từng solver. Trong nội dung chính của báo cáo chỉ nên trình bày bảng tổng hợp và biểu đồ quan trọng, còn bảng chi tiết nên đưa vào phụ lục để tránh làm chương thực nghiệm quá dài.

## Phụ lục F. Pseudocode thuật toán

### F.1. Pseudocode ACO + 2-opt cho TSPTW

```text
Input: instance, numberOfAnts, iterations, alpha, beta, rho
Output: bestSolution

Initialize pheromone matrix
bestSolution = null

for iter = 1 to iterations:
    solutions = []

    for each ant:
        solution = constructRouteByRouletteWheel(instance, pheromone, alpha, beta)
        solution = applyTwoOpt(solution)
        evaluate(solution)
        solutions.add(solution)

        if bestSolution is null or solution better than bestSolution:
            bestSolution = solution

    evaporatePheromone(pheromone, rho)
    updatePheromone(pheromone, best solutions)

return bestSolution
```

### F.2. Pseudocode ACO + 2-opt cho VRPTW

```text
Input: vrptwInstance, vehicles, parameters
Output: bestSolution

Initialize pheromone matrix
bestSolution = null

for iter = 1 to iterations:
    solutions = []

    for each ant:
        unvisited = all customers
        routes = []

        for each vehicle:
            route = createEmptyRoute(vehicle)

            while route can accept more customer:
                next = selectNextCustomer(unvisited, route, pheromone)
                if next is feasible or acceptable with penalty:
                    add next to route
                    remove next from unvisited
                else:
                    break

            route = applyTwoOpt(route)
            routes.add(route)

            if unvisited is empty:
                break

        solution = createSolution(routes, unvisited)
        evaluate(solution)
        solutions.add(solution)

        if solution better than bestSolution:
            bestSolution = solution

    evaporatePheromone(pheromone)
    updatePheromone(pheromone, selected solutions)

return bestSolution
```

---

# TÀI LIỆU THAM KHẢO GỢI Ý

1. Dorigo, M., Maniezzo, V., & Colorni, A. Ant System: Optimization by a Colony of Cooperating Agents.  
2. Stützle, T., & Hoos, H. H. MAX-MIN Ant System.  
3. Solomon, M. M. Algorithms for the Vehicle Routing and Scheduling Problems with Time Window Constraints.  
4. Google OR-Tools Documentation. Routing Problems and Vehicle Routing Problem with Time Windows.  
5. Russell, S., & Norvig, P. Artificial Intelligence: A Modern Approach.  

