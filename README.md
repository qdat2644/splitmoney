# Zyra — Không gian tài chính thông minh

Ứng dụng web hiện đại để quản lý chi tiêu nhóm, tự động tính toán công nợ tối ưu.

## 🚀 Cài đặt và chạy

```bash
# 1. Cài đặt dependencies
npm install

# 2. Chạy dev server
npm run dev

# 3. Mở trình duyệt tại http://localhost:5173
```

## 📁 Cấu trúc thư mục

```
src/
├── components/
│   ├── layout/         # Navbar, Sidebar, Layout
│   ├── ui/             # Avatar, Modal, Toast (tái sử dụng)
│   ├── expenses/       # ExpenseCard, AddExpenseModal
│   ├── members/        # MemberCard
│   ├── settlements/    # SettlementList
│   ├── dashboard/      # SummaryCard
│   └── charts/         # ChartsSection (Recharts)
├── pages/              # Dashboard, Expenses, Members, Settlements, Analytics
├── hooks/              # useLocalStorage, useToast
├── utils/              # calculations, formatters, exportCsv
├── data/               # mockData (4 thành viên, 10 khoản chi)
├── services/           # storageService (abstraction layer)
└── context/            # AppContext (global state)
```

## ✨ Tính năng

| Tính năng | Mô tả |
|---|---|
| 📊 Dashboard | Tổng quan: tổng chi, thành viên, top payer, top debtor |
| 💰 Khoản chi | Thêm/sửa/xoá, filter, search, sort |
| 👥 Thành viên | Thêm/xoá, avatar màu, số dư real-time |
| 🔄 Công nợ | Thuật toán tối ưu giảm số lần chuyển khoản |
| 📈 Thống kê | Bar chart, Pie chart, Area chart (Recharts) |
| 💾 LocalStorage | Tự lưu, reload không mất dữ liệu |
| 📥 Export CSV | Xuất khoản chi và công nợ ra file CSV |
| 🎨 Dark mode | Mặc định dark, có nút toggle |
| 🔔 Toast | Thông báo animation mượt mà |

## 🛠 Công nghệ

- **React 18** + **Vite** — build tool nhanh
- **TailwindCSS** — utility-first CSS
- **Framer Motion** — animations mượt
- **Lucide React** — icons đẹp
- **Recharts** — biểu đồ
- **React Router** — điều hướng

## 🔮 Nâng cấp backend sau này

Chỉ cần sửa `src/services/storageService.js`:
```js
// Thay localStorage bằng API calls:
export const expenseService = {
  getAll: () => fetch('/api/expenses').then(r => r.json()),
  saveAll: (data) => fetch('/api/expenses', { method: 'POST', body: JSON.stringify(data) }),
};
```

## 📦 Build production

```bash
npm run build
# Output tại thư mục dist/ — deploy lên Vercel/Netlify
```
