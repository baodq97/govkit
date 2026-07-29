# Enterprise lifecycle map — sơ đồ tuyến vòng đời sản phẩm

`lifecycle-map.html` — mở thẳng bằng browser, một file, không cần server.

Bản đồ kiểu metro cho vòng đời sản phẩm hai plane, kết quả buổi brainstorm 2026-07-29
(field-verified sweep + khảo sát btm-platform):

- **Tuyến B (Business)**: captured → gate value/strategy → validated → gate funding →
  committed. System of record: workflow platform (BPF + approval matrix).
- **Tuyến E (Engineering)**: doc chain → gate spec → build → gate ship → release →
  hypercare → operate. System of record: git repo, govkit phủ FULL.
- **Hai ga liên tuyến** (hai đoàn tàu cùng đỗ, không hand-off qua tường):
  U-1 Classify & Inception (classify + PRD lập chung, initiative-id ↔ PRD) và
  U-2 Showcase & Benefit (outcome data ↔ benefit realization). govkit PARTIAL tại seam.
- Vòng R7 flywheel, các nhánh kill/park/probe/defect, và vùng phủ govkit
  (FULL / PARTIAL / GAP) vẽ trực tiếp trên bản đồ.

Tách model/view: khối `MODEL` (FSM: states + transitions + actors + evidence + govkit
coverage) là nguồn chân lý; `POS`/`ROUTES`/`EDGE_STYLE` chỉ là trình bày; render loop
generic đọc MODEL. Muốn sửa nội dung thì chỉ sửa `MODEL`. Click (hoặc Tab + Enter) vào
ga để xem ai verify, evidence gì, govkit làm gì tại đó.

Trạng thái: research artifact, không thuộc corpus governed. Hướng phát triển đã bàn:
thêm khối `instances` (token đoàn tàu trên map, funnel count, express lane theo tier)
và đổ dữ liệu thật cho tuyến E từ `govkit report --aging --json`. Candidate pilot:
btm-platform.
