# 璐＄尞鎸囧崡 路 Contributing

鎰熻阿浣犳効鎰忔敼杩涖€屼綑棰濆皬鍙ｈ銆嶃€傝繖涓」鐩緢灏忥紝浣嗗笇鏈涘畠淇濇寔**鍙銆佸彲楠岃瘉銆佷笉鍋锋暟鎹?*銆?
English summary at the bottom.

## 琛屼负鍑嗗垯

鍙備笌鏈」鐩嵆琛ㄧず鍚屾剰閬靛畧 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)銆?
## 鎶ュ憡闂

- **Bug / 鍔熻兘寤鸿**锛氫娇鐢?[Issue 妯℃澘](https://github.com/Llii-div/dsh-balance-pocket/issues/new/choose)銆?- **瀹夊叏婕忔礊**锛氫笉瑕佸紑鍏紑 Issue锛岃鎸?[SECURITY.md](SECURITY.md) 绉佷笅鎶ュ憡銆?- 鎻?Issue 鍓嶈鍏堟悳绱㈡槸鍚﹀凡鏈夌浉鍚岄棶棰橈紱闄勪笂 DSH 鐗堟湰銆佹搷浣滅郴缁熴€佸鐜版楠わ紝浠ュ強**鑴辨晱鍚庣殑**閿欒淇℃伅銆?  璇蜂笉瑕佽创 `DEEPSEEK_API_KEY`銆佽处鍙?token 鎴栧畬鏁寸殑 `ledger.json`銆?
## 寮€鍙戠幆澧?
- Node.js **>= 18**锛堝彧鐢ㄤ簬鑷锛屾彃浠舵湰韬病鏈夎繍琛屾椂渚濊禆锛夈€?- 涓嶉渶瑕?`npm install`锛屼篃娌℃湁鏋勫缓姝ラ銆?- 缂栬緫鍣ㄥ缓璁紑鍚?EditorConfig锛涗粨搴撳凡鎻愪緵 `.editorconfig`銆?
```bash
node check.mjs   # 鍏ㄩ儴 72 椤归€氳繃鍚庡啀鎻愪氦 PR
```

## 浠ｇ爜绾﹀畾

**Host 绔紙`plugin/index.js`銆乣peak.js`銆乣ledger.js`锛?*

- 绾?ESM锛岄浂绗笁鏂逛緷璧栥€?- `peak.js` / `ledger.js` 淇濇寔绾嚱鏁板紡銆佸彲鐙珛娴嬭瘯锛涙枃浠?I/O 闆嗕腑鍦?`ledger.js`锛屼笖浠讳綍寮傚父閮戒笉鑳藉啋娉″埌 UI銆?- **鍑嵁鍙敤浜庤姹?DeepSeek 鎺ュ彛**锛氫笉寰楀啓杩涘搷搴斻€佹棩蹇椼€侀敊璇枃妗堟垨璐︽湰銆?- 鏂板璺敱鎴栬鍙栫幆澧冨彉閲忔椂锛屽悓姝ユ洿鏂?README 鐨勩€岄殣绉佷笌瀹夊叏銆嶅拰 `docs/DESIGN.md`銆?- 瀹氭椂鍣ㄥ繀椤?`unref()` 鎴栧湪 `ctx.effect` 鐨?disposer 閲屾竻鐞嗐€?
**Client 绔紙`plugin/client.js`锛?*

- 鎵嬪啓 React锛氬彧鐢?`require('react')` + `React.createElement`锛坄h`锛夛紝涓嶅紩鍏?JSX/鏋勫缓宸ュ叿銆?- 棰滆壊銆佸瓧浣撲竴寰嬩娇鐢ㄤ富棰?token锛坄--dsw-alias-*`銆乣--dsw-specific-*`锛夛紝涓嶈纭紪鐮佷寒鑹?鏆楄壊銆?- 鎵€鏈夊彲瑙佹枃妗堥兘瑕佸悓鏃跺姞鍒?`zh` 鍜?`en` 瀛楀吀锛涗笉瑕佺洿鎺ュ啓姝讳腑鏂囥€?- 鎵€鏈夊畾鏃跺櫒銆佷簨浠剁洃鍚€乻lot 娉ㄥ唽銆乴ocale 娉ㄥ唽閮借鍦?`ctx.effect` 杩斿洖鐨?disposer 閲屾竻鐞嗐€?- 涓嶈璇诲彇鍏朵粬鎻掍欢鐨?DOM锛涘彧閫氳繃 DSH 鎻愪緵鐨?slot / locale / service API 宸ヤ綔銆?
**娴嬭瘯**

- `check.mjs` 鏄敮涓€娴嬭瘯鍏ュ彛锛涙柊澧炶涓鸿琛ュ搴旀柇瑷€锛屽苟淇濇寔 100% 閫氳繃銆?- 淇敼璺敱瀹夊叏銆佽处鏈鍒欍€佸嘲璋疯竟鐣屾椂锛屽姟蹇呭厛琛ユ祴璇曞啀鏀瑰疄鐜般€?
## 鎻愪氦 PR

1. Fork 浠撳簱锛屼粠 `main` 寤哄垎鏀細`feat/xxx`銆乣fix/xxx`銆乣docs/xxx`銆?2. 鎻愪氦淇℃伅鐢?[Conventional Commits](https://www.conventionalcommits.org/)锛?   `feat: ...`銆乣fix: ...`銆乣docs: ...`銆乣chore: ...`銆?3. 杩愯 `node check.mjs`锛屽叏缁裤€?4. 鍚屾鏇存柊锛歚CHANGELOG.md` 鐨?`[Unreleased]`锛涙湁濂戠害鍙樺寲鏃舵洿鏂?`docs/DESIGN.md`銆?5. 鍙戣捣 PR锛屽～鍐?PR 妯℃澘閲岀殑妫€鏌ラ」銆?
缁存姢鑰呭悎骞舵椂榛樿 **Squash and merge**锛岃淇濇寔涓€涓?PR 鍙仛涓€浠朵簨銆?
## 缁存姢鑺傚亣鏃ヨ〃

鑺傚亣鏃ヨ〃鍦?`plugin/holidays.js`锛堟寜骞翠唤鍒嗙粍锛岀函鏁版嵁锛夈€傚浗鍔￠櫌姣忓勾 11 鏈堝彂甯冩骞存斁鍋囧畨鎺掞紝
鏂板骞翠唤鏃讹細

1. 鍙垪**鏀惧亣涓嶄笂鐝?*鐨勬棩鏈燂紱璋冧紤涓婄彮鐨勫懆鏈笉瑕佸垪锛堝懆鏈鍒欏凡缁忚鐩栵級銆?2. 鍦?`check.mjs` 閲岃ˉ璇ュ勾浠界殑杈圭晫鏂█锛堣嚦灏戯細鍋囨湡绗竴澶┿€佹渶鍚庝竴澶┿€佽妭鍚庨涓伐浣滄棩 09:00锛夈€?   琛ㄧ粨鏋勪笌銆屾瘡涓亣鏈熼兘涓嶅垽楂樺嘲銆嶅凡鏈夐€氱敤鏂█锛屾柊澧炲勾浠戒細鑷姩琚畠浠鏌ャ€?3. 鍚屾鏇存柊 README 鐨勩€屽凡鐭ラ檺鍒躲€嶅拰 CHANGELOG銆?4. 鏈敹褰曞勾浠戒笉闇€瑕佺壒娈婂鐞嗭細`peakState()` 浼氳繑鍥?`holidayCovered: false`锛岀晫闈㈣嚜鍔ㄦ彁绀恒€?
## 鍙戝竷娴佺▼锛堢淮鎶よ€咃級

```bash
# 1. 鏇存柊 plugin/package.json 涓庢牴 package.json 鐨?version锛屾洿鏂?CHANGELOG.md
node check.mjs
git add -A
git commit -m "chore: release v0.1.0"
git tag v0.1.0
git push origin main --tags
```

鎺ㄩ€?`v*` 鏍囩浼氳Е鍙?`.github/workflows/release.yml`锛氳窇鑷 鈫?`npm pack` 鍑?`dsh-balance-pocket-<version>.tgz` 鈫?鍒涘缓 GitHub Release 骞堕檮涓?tarball銆?DSH 鐢ㄦ埛鍙互鐩存帴鐢ㄨ繖涓?tarball 瀹夎锛堣 README 鏂瑰紡 B锛夈€?
## English summary

- Be kind; read the code of conduct.
- Report bugs through the issue templates, security issues privately via SECURITY.md.
- Node >= 18 for tests only; no build step, no runtime dependencies.
- Run `node check.mjs` before opening a PR; add assertions for new behaviour.
- Keep Host code dependency-free, never log or return credentials, use theme tokens,
  add both `zh` and `en` strings, and dispose every timer/listener/slot.
- Conventional Commits, one concern per PR, update CHANGELOG and docs.
- Maintainers squash-merge, and tag `vX.Y.Z` to publish a GitHub Release tarball.
