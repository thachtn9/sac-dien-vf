# VinFast — Quản lý trạm sạc

Web React quản lý trụ sạc xe máy điện VinFast: quét QR để sạc / thêm trụ, theo dõi 4 cổng/trụ, đổi trạng thái, ghi lịch sử.

## Chạy local

```bash
cp .env.example .env
# Điền VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY

npm install
npm run dev
```

## Supabase

1. Tạo project trên [supabase.com](https://supabase.com)
2. SQL Editor → chạy toàn bộ [`supabase/schema.sql`](supabase/schema.sql)
3. Project Settings → API → copy URL + **publishable/anon** key vào `.env`
4. (Tuỳ chọn) Database → Replication → bật realtime cho `pillars`, `ports`

## Deploy Vercel

1. Push repo lên GitHub
2. [vercel.com/new](https://vercel.com/new) → Import repo
3. Framework: **Vite** (tự nhận)
4. Thêm Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY` (publishable/anon key)
5. Deploy

SPA routing đã cấu hình trong [`vercel.json`](vercel.json).

## Tính năng

- Dashboard lưới 30 trụ + trạng thái cổng
- Quét để sạc: QR → chọn cổng; trụ chưa có sẽ được thêm tự động
- Chi tiết trụ: nhấn giữ tên/mã để đổi; chạm badge/cổng để đổi status
- Lịch sử sạc, kết thúc phiên đang mở
