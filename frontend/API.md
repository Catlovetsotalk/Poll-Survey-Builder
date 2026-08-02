# Poll & Survey Builder — API Reference

Tài liệu này dành cho frontend (React). Không cần đọc code backend — mọi thứ cần biết để gọi API nằm ở đây.

## Base URL

| Môi trường | URL |
|---|---|
| Backend chạy qua Visual Studio (F5) | `https://localhost:7188/api` |
| Backend chạy qua Docker (`docker compose up`) | `http://localhost:8080/api` |
| Production (Render) | *(cập nhật sau khi deploy xong — xem thông báo trong nhóm)* |

⚠️ Dùng `http://localhost:7188` sẽ bị trình duyệt chặn vì chứng chỉ HTTPS tự ký (self-signed) — nếu gặp lỗi network khi gọi API lần đầu, mở thẳng URL đó trên trình duyệt, bấm "Advanced > Proceed" một lần để trình duyệt tin tưởng cert.

## Bắt buộc: `withCredentials: true`

Backend dùng cookie để nhận diện "ai đang vote" và "ai là người tạo poll" — **không cần đăng nhập**. Mọi request phải gửi kèm cookie, nếu không cơ chế chống vote trùng và khoá quyền đóng poll sẽ không hoạt động.

```js
// axios
const api = axios.create({
  baseURL: "https://localhost:7188/api",
  withCredentials: true,
});

// fetch
fetch(url, { credentials: "include", ... })
```

---

## 1. Tạo poll

```
POST /polls
```

**Request body:**
```json
{
  "question": "Bạn thích ngôn ngữ nào nhất?",
  "options": ["C#", "Python", "JavaScript"],
  "expiresAt": null
}
```
- `options`: 2 đến 6 phần tử, không được rỗng.
- `expiresAt`: ISO 8601 datetime, hoặc `null`/bỏ qua nếu poll không tự hết hạn.

**Response `201 Created`:**
```json
{ "code": "PvYSHe" }
```

**Response lỗi `400 Bad Request`** — khi `options` < 2, > 6, hoặc có phần tử rỗng.

**Side effect:** server set 2 cookie:
- `voter_token` — dùng chung cho mọi poll người này ghé qua.
- `creator_token_{code}` — riêng cho poll vừa tạo, cần giữ để gọi được `/close` sau này. **Chỉ trình duyệt tạo poll này mới có quyền đóng nó.**

---

## 2. Lấy thông tin poll (trang vote)

```
GET /polls/{code}
```

**Response `200 OK`:**
```json
{
  "code": "PvYSHe",
  "question": "Bạn thích ngôn ngữ nào nhất?",
  "status": "open",
  "expiresAt": null,
  "hasVoted": false,
  "options": [
    { "optionIndex": 0, "text": "C#" },
    { "optionIndex": 1, "text": "Python" },
    { "optionIndex": 2, "text": "JavaScript" }
  ]
}
```
- `status`: `"open"` hoặc `"closed"` (đã đóng, hoặc đã hết hạn theo `expiresAt`).
- `hasVoted`: `true` nếu trình duyệt này (theo `voter_token`) đã vote poll này rồi — dùng để ẩn form vote, hiện "bạn đã vote rồi".

**Response `404 Not Found`** — code không tồn tại. Hiện trang "Poll not found".

---

## 3. Vote

```
POST /polls/{code}/vote
```

**Request body:**
```json
{ "optionIndex": 0 }
```

**Response `204 No Content`** — vote thành công, không có body. Sau khi nhận, gọi lại `GET /polls/{code}/results` (hoặc chờ SignalR tự đẩy) để hiện kết quả.

**Response lỗi:**
| Status | Khi nào | Nên hiện gì cho user |
|---|---|---|
| `404` | code không tồn tại | "Poll not found" |
| `409` | poll đã đóng | "Poll đã đóng, không nhận vote mới" |
| `409` | đã vote rồi | "Bạn đã vote poll này rồi" |
| `400` | `optionIndex` không hợp lệ | không nên xảy ra nếu UI chỉ cho chọn option có sẵn |

---

## 4. Lấy kết quả (trang results)

```
GET /polls/{code}/results
```

**Response `200 OK`:**
```json
{
  "code": "PvYSHe",
  "question": "Bạn thích ngôn ngữ nào nhất?",
  "status": "open",
  "totalVotes": 12,
  "options": [
    { "optionIndex": 0, "text": "C#", "voteCount": 7 },
    { "optionIndex": 1, "text": "Python", "voteCount": 3 },
    { "optionIndex": 2, "text": "JavaScript", "voteCount": 2 }
  ]
}
```

Dùng response này để vẽ bar chart (`voteCount / totalVotes` = tỉ lệ %).

---

## 5. Đóng poll (chỉ người tạo)

```
POST /polls/{code}/close
```

Không cần body. Yêu cầu cookie `creator_token_{code}` phải khớp với poll — chỉ trình duyệt đã tạo poll này mới gọi được.

**Response `204 No Content`** — đóng thành công.

**Response `403 Forbidden`** — không phải người tạo (cookie sai/thiếu). Hiện nút "Close poll" **chỉ khi** trình duyệt hiện tại là người tạo — cách đơn giản nhất: lưu lại `code` của poll vừa tạo vào `localStorage` phía frontend ngay sau bước 1, chỉ hiện nút Close nếu `code` đang xem nằm trong danh sách poll do chính mình tạo.

---

## 6. Live results qua SignalR (real-time, không cần polling)

Cài package:
```
npm install @microsoft/signalr
```

Kết nối:
```js
import * as signalR from "@microsoft/signalr";

const connection = new signalR.HubConnectionBuilder()
  .withUrl("https://localhost:7188/hubs/poll", { withCredentials: true })
  .withAutomaticReconnect()
  .build();

connection.on("resultsUpdated", (results) => {
  // results có đúng shape như response của GET /polls/{code}/results (mục 4)
  console.log(results.totalVotes, results.options);
  // setState(results) để re-render biểu đồ
});

await connection.start();
await connection.invoke("JoinPollGroup", code); // code = mã poll đang xem
```

**Khi nào gọi `JoinPollGroup`:** ngay khi user mở trang results, sau khi `connection.start()` thành công. Nếu không join group, sẽ không nhận được update nào cho poll đó — SignalR chỉ đẩy tin cho những kết nối đã "đăng ký" đúng poll.

**Khi rời trang** (unmount component): nên gọi thêm để dọn dẹp, tránh giữ kết nối/group thừa:
```js
await connection.invoke("LeavePollGroup", code);
await connection.stop();
```

**Trigger:** mỗi lần có ai vote thành công (mục 3) hoặc poll bị đóng (mục 5), server tự đẩy sự kiện `resultsUpdated` cho toàn bộ client đang xem đúng poll đó — không cần frontend tự gọi lại API.

---

## Bảng tổng hợp status code

| Code | Ý nghĩa chung trong API này |
|---|---|
| 200 | Thành công, có dữ liệu trả về |
| 201 | Tạo poll thành công |
| 204 | Thành công, không có dữ liệu trả về (vote, close) |
| 400 | Request sai định dạng/dữ liệu |
| 403 | Không có quyền (không phải creator) |
| 404 | Không tìm thấy poll |
| 409 | Xung đột trạng thái (đã vote rồi / poll đã đóng) |

## Câu hỏi / vướng mắc

Nhắn trực tiếp cho [tên bạn — người làm backend], kèm ảnh chụp lỗi network tab (F12 > Network) nếu là lỗi gọi API không rõ nguyên nhân.
