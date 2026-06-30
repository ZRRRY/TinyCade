$add = @"
.touch-btn.down { grid-column: 2; grid-row: 3; }

/* 动作行：暂停 / 重开 / 返回（手机专用） */
.touch-action-row {
  display: none;
  margin-top: 8px;
  grid-template-columns: repeat(3, 60px);
  gap: 4px;
  justify-content: center;
}
.touch-action-row.show { display: grid; }
.touch-action-row .touch-btn {
  background: rgba(255, 0, 102, 0.15);
  border-color: var(--neon-pink);
  color: var(--neon-pink);
  font-size: 12px;
}
.touch-action-row .touch-btn:active {
  background: var(--neon-pink);
  color: var(--bg-deep);
}

/* 手机端：手柄按真实宽度等比放大，避免太小点不到 */
@media (max-width: 720px) {
  .touch-controls { grid-template-columns: repeat(3, 64px); grid-template-rows: repeat(3, 64px); }
  .touch-action-row { grid-template-columns: repeat(3, 64px); }
  .touch-btn { font-size: 18px; }
  .touch-action-row .touch-btn { font-size: 12px; }
}
@media (max-width: 380px) {
  .touch-controls { grid-template-columns: repeat(3, 56px); grid-template-rows: repeat(3, 56px); }
  .touch-action-row { grid-template-columns: repeat(3, 56px); }
}
"@
$src = Get-Content style.css -Raw
$out = $src -replace [regex]::Escape('.touch-btn.down { grid-column: 2; grid-row: 3; }'), $add
[System.IO.File]::WriteAllText((Resolve-Path style.css).Path, $out, [System.Text.UTF8Encoding]::new($false))
Write-Host "OK"
