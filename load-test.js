/**
 * K6 LOAD TEST SCRIPT
 * 
 * PHÂN TÍCH SOURCE CODE:
 * - Route chính: GET `/` (trang chủ React) và các static assets (JS, CSS) trong thư mục `/assets`.
 * - API bị bỏ qua: POST `/api/ai/parse-expense`.
 * 
 * LÝ DO KHÔNG TEST MẠNH VÀ BỎ QUA MỘT SỐ ENDPOINT:
 * - API `/api/ai/parse-expense` là endpoint gọi trực tiếp đến dịch vụ AI (Gemini/OpenAI) tốn phí và giới hạn rate limit. Việc spam sẽ dẫn đến tốn tiền và bị block API key.
 * - Project không có các GET API lấy dữ liệu từ database (dữ liệu được lưu offline ở localStorage theo kiến trúc ứng dụng).
 * - Mục tiêu chỉ là test tải cơ bản (page load/static server) để kiểm tra khả năng chịu truy cập đồng thời của server Node.js.
 * 
 * QUY TẮC:
 * - Tuyệt đối KHÔNG spam các endpoint AI, upload, tạo dữ liệu.
 * - Cấu hình request nhẹ nhàng, mô phỏng user thật với delay (sleep).
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

// Cấu hình k6
export const options = {
    vus: 50, // 50 virtual users
    duration: '30s', // Chạy trong 30 giây
    thresholds: {
        http_req_failed: ['rate<0.05'], // Tỉ lệ lỗi phải nhỏ hơn 5%
        http_req_duration: ['p(95)<1000'], // 95% request phải hoàn thành dưới 1000ms (1s)
    },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
    // 1. Test tải trang chủ (GET Homepage)
    const resHome = http.get(`${BASE_URL}/`);
    check(resHome, {
        'homepage status is 200': (r) => r.status === 200,
        'homepage response time is OK': (r) => r.timings.duration < 500,
    });

    // Mô phỏng user đọc trang trong 1-3 giây
    sleep(Math.random() * 2 + 1);

    // 2. [VÔ HIỆU HÓA] Test gọi AI API (TỐN PHÍ)
    // Uncomment đoạn dưới đây NẾU BẠN THỰC SỰ MUỐN TEST VÀ CHẤP NHẬN TRẢ PHÍ.
    // LƯU Ý: Rất dễ bị rate limit hoặc cạn tiền tài khoản. Chỉ nên để VUs rất nhỏ (ví dụ 1-2).
    /*
    const payload = JSON.stringify({ text: "Mua cà phê 50k" });
    const params = { headers: { 'Content-Type': 'application/json' } };
    const resAi = http.post(`${BASE_URL}/api/ai/parse-expense`, payload, params);
    check(resAi, {
        'ai api status is 200': (r) => r.status === 200,
    });
    sleep(Math.random() * 2 + 1);
    */
}

/**
 * CÁCH CHẠY TEST:
 * 
 * Cách 1 (Mặc định dùng http://localhost:3000):
 * k6 run load-test.js
 * 
 * Cách 2 (Truyền URL của backend đang chạy thật, ví dụ http://localhost:5000):
 * BASE_URL=http://localhost:5000 k6 run load-test.js
 */
