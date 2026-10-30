# 瀹夊叏绛栫暐 路 Security Policy

## 鏀寔鑼冨洿

| 鐗堟湰 | 鏀寔 |
|---|---|
| 0.1.x | 鉁?鎺ュ彈瀹夊叏鎶ュ憡 |
| < 0.1.0 | 鉂?涓嶆彁渚涙敮鎸?|

## 鎶ュ憡婕忔礊

**璇蜂笉瑕佸紑鍏紑 Issue銆?* 璇蜂娇鐢?GitHub 鐨勭瀵嗘紡娲炴姤鍛婏細

馃憠 https://github.com/Llii-div/dsh-balance-pocket/security/advisories/new

鎶ュ憡閲岃鍖呭惈锛氬彈褰卞搷鐨勭増鏈€佸鐜版楠ゃ€佸奖鍝嶆弿杩帮紝浠ュ強锛堝鏈夛級鏈€灏?PoC銆?**涓嶈**闄勫甫鐪熷疄鐨?`DEEPSEEK_API_KEY`銆佽处鍙?token 鎴栧畬鏁磋处鏈枃浠讹紱濡傞渶灞曠ず锛岃鎵撶爜鎴栦娇鐢ㄤ吉閫犲€笺€?
鎴戜細灏藉揩纭鏀跺埌骞惰瘎浼板奖鍝嶏紱淇鍙戝竷鍚庝細鍦?Advisory 涓?CHANGELOG 涓嚧璋紙闄ら潪浣犲笇鏈涘尶鍚嶏級銆?
## 璁捐涓婄殑瀹夊叏杈圭晫

杩欎釜鎻掍欢澶勭悊浣欓涓庡嚟鎹紝鍥犳浠ヤ笅绾︽潫灞炰簬**瀹夊叏濂戠害**锛屼换浣曟敼鍔ㄩ兘涓嶅緱鍓婂急锛?
1. **鍑嵁涓嶅嚭 Host 绔?*锛歚DEEPSEEK_API_KEY` / 璐﹀彿 token 鍙敤浜庡悜 DeepSeek 瀹樻柟鎺ュ彛鍙戣姹傦紝
   涓嶅緱鍑虹幇鍦ㄥ揩鐓у搷搴斻€佹棩蹇椼€侀敊璇枃妗堛€丏OM 鎴栬处鏈枃浠朵腑銆?2. **蹇収璺敱涓ゅ眰淇′换**锛氬厛鏍￠獙 `Host` 蹇呴』涓哄洖鐜湴鍧€锛坄localhost` / `127.0.0.0/8` / `::1`锛夈€?   `Sec-Fetch-Site` 涓嶅緱涓?`cross-site`銆佸甫 `Origin` 鏃跺繀椤讳笌 `Host` 鍚屾簮锛涢殢鍚庡湪 Harness 鎻愪緵
   `connection.requestRejection` 鏃?*濮旀墭**瀹夸富鏍呮爮锛堝畠鐭ラ亾 `--trusted-host` 涓庡弽鍚戜唬鐞嗭級锛?   鏍呮爮鎶涘紓甯镐竴寰嬫寜鎷掔粷澶勭悊锛坒ail-closed锛夈€備粎鍦ㄦ病鏈夋爡鏍忕殑鑰?Harness 涓婏紝
   鎵嶅洖钀藉埌 `DSH_BALANCE_POCKET_TRUSTED_HOSTS` 鏄惧紡鏀捐鍒楄〃 鈥斺€?   **鏀捐鍚庡悓缃戞浠讳綍鑳借闂鍦板潃鐨勮澶囬兘鑳借鍙栦綑棰?*锛屽睘浜庣敤鎴锋樉寮忛€夋嫨鍔犲叆鐨勯闄┿€?3. **鍙**锛氭彃浠朵笉鍐?profile銆佷笉鏀瑰叾浠栨彃浠舵暟鎹紱鍞竴鐨勮惤鐩樻槸 `$DSH_HOME/dsh-balance-pocket/ledger.json`锛?   鍐呭鍙湁鏃ユ湡銆佷綑棰濇暟鍊笺€佸竵绉嶅拰鏉ユ簮鏍囪瘑銆?4. **鏈€灏忎緷璧?*锛欻ost 涓?Client 閮戒笉寮曞叆绗笁鏂硅繍琛屾椂渚濊禆锛屽鎴风鏃犳瀯寤恒€佹棤杩滅▼鑴氭湰銆?5. **閿欒涓嶆硠闇插唴閮ㄤ俊鎭?*锛氳矾鐢变换浣曞唴閮ㄥけ璐ラ兘杩斿洖 200 + 閫氱敤閿欒鏂囨锛屼笉杩斿洖鍫嗘爤銆佽矾寰勬垨鍑嵁銆?6. **涓嶅亣瑁呯煡閬?*锛氶挶鍖呭瓧娈电己澶辨椂鍒や负銆屼笉鍙敤銆嶈€屼笉鏄?`0`锛涜妭鍋囨棩琛ㄦ湭瑕嗙洊鐨勫勾浠戒細鍦ㄧ晫闈㈡槑纭彁绀猴紝
   澶嶇敤杩囨湡璇绘暟浼氭爣娉ㄥ欢杩熸椂闂?鈥斺€?瀹佸彲鏄剧ず銆屼笉鐭ラ亾銆嶏紝涔熶笉缁欑敤鎴蜂竴涓湅璧锋潵纭畾浣嗛敊璇殑鍊笺€?
## 涓嶅湪鑼冨洿鍐?
- 闇€瑕佺敤鎴峰厛瀹夎鎭舵剰鎻掍欢/淇敼绯荤粺鎵嶈兘瑙﹀彂鐨勬敾鍑伙紱
- DeepSeek 瀹樻柟鎺ュ彛鑷韩鐨勫畨鍏ㄩ棶棰橈紙璇锋姤鍛婄粰 DeepSeek锛夛紱
- 宸叉槑纭爣娉ㄤ负銆屼粎鎻愮ず銆佷笉鍙備笌璁¤垂銆嶇殑灞曠ず閫昏緫銆?
## English

Report vulnerabilities privately via GitHub Security Advisories
(https://github.com/Llii-div/dsh-balance-pocket/security/advisories/new), never in a public issue.
Do not include real API keys or tokens. Supported versions: 0.1.x.

Security contract: credentials never leave the Host process and never appear in responses/logs/DOM;
the snapshot route validates loopback `Host`, `Origin` and `Sec-Fetch-Site`, then delegates to the
Harness trust fence (`connection.requestRejection`) when present and fails closed if it throws 鈥?LAN access is opt-in via `DSH_BALANCE_POCKET_TRUSTED_HOSTS` only on Harnesses without that fence, and
doing so exposes the balance to anyone on that network; the plugin is read-only apart from its own
ledger file; no third-party runtime dependencies; internal errors are never exposed verbatim;
missing wallet fields are reported as unavailable rather than 0, an uncovered holiday year is labelled,
and a reused stale reading shows its age.
