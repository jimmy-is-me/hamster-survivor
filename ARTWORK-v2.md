# 1.2 圖片補齊與完整動作

使用內建 ImageGen 產出六張透明 PNG，參考既有授權 TATA 延伸素材。所有檔案保存在本專案 assets/。圖示共 64 格；八位角色各有待機、左右踏步、完整攻擊四格，共 32 格。原始生成檔保留在 Codex generated_images。

`assets/atlas-v2.json` 與 `atlas-v2.js` 記錄每格完整來源範圍。以透明間隔決定格線，檢查每格邊界不切到不透明像素；只讀取 PNG 分析來源座標，不修改生成圖像。

## assets/weapons-v2.png

參考：items-v4.png

提示詞：

Production game sprite atlas, true transparent background. EXACTLY 4 columns by 4 rows of equal SQUARE cells, 16 cells. Each entire object inside middle 65% of its cell, generous blank transparent gutters at least 17% on EVERY side. No neighboring shapes crossing cell borders. No labels, no text, no grid lines. Match reference TATA: thick slightly wobbly charcoal outline, flat pastel colors, simple cute handdrawn doodle, NO watercolor or elaborate rendering. Each cell is distinctly different. Row1 left to right: pink flower-petal SHURIKEN (no wooden handle); gold protective ring orbiting with three tiny stars; round pink flower-bud bomb with leaf fuse; three colorful star fireworks rockets. Row2: little smiling sun encircled by sunbeam aura; a white winged heart-tipped ARROW; yellow lightning zigzag inside blue star; ONE folded taco boomerang (not bag). Row3: blue crescent snowflake crystal; shallow puddle of honey with tiny flower floating; beetle-horn glass capsule machine with a small cannon nozzle; spiral tornado made of pink petals. Row4: two crossed wooden flower wands; falling shooting star with long pink trail; leaf-shaped danger marker with dark exclamation; golden four-point impact spark with pink puff. All objects isolated, no other objects in gutters.

## assets/equipment-v2.png

參考：items-v4.png

提示詞：

Production game sprite atlas, true transparent background. EXACTLY 4 columns by 4 rows of equal SQUARE cells, 16 cells. Each entire object inside middle 65% of its cell, generous blank transparent gutters at least 17% on EVERY side. No neighboring shapes crossing cell borders. No labels, no text, no grid lines. Match reference TATA: thick slightly wobbly charcoal outline, flat pastel colors, simple cute handdrawn doodle, NO watercolor or elaborate rendering. Each cell is distinctly different. Row1: mint speedy boots with tiny wings; yellow star horseshoe MAGNET; pink heart pendant on necklace; flower-shaped exercise dumbbell. Row2: four-leaf clover with little lucky bead; cream tea cup with pink flower printed on cup; blue telescope on tiny tripod; gold pocket watch with leaf hands. Row3: white beetle-horn shield; gold ring with small star gem; yellow spring-soled BOOTS; peach cape with leaf clasp. Row4: blue adventure notebook with bookmark; pink knitted scarf with white heart; white angel-wing brooch with pastel gem; round green archery target with one leaf arrow. No weapons or repeated silhouettes.

## assets/supplies-v2.png

參考：items-v4.png

提示詞：

Production game sprite atlas, true transparent background. EXACTLY 4 columns by 4 rows of equal SQUARE cells, 16 cells. Each entire object inside middle 65% of its cell, generous blank transparent gutters at least 17% on EVERY side. No neighboring shapes crossing cell borders. No labels, no text, no grid lines. Match reference TATA: thick slightly wobbly charcoal outline, flat pastel colors, simple cute handdrawn doodle, NO watercolor or elaborate rendering. Each cell is distinctly different. Row1: mint gardening gloves; silver beetle-shaped badge on green ribbon; little crown made of flowers; EASY difficulty emblem of one small green seedling inside round wooden token. Row2: NORMAL difficulty emblem of twin amber leaves inside shield token; HARD difficulty emblem of purple mountain with three peaks inside pointed token; healing red berry with tiny bandage leaf; lunch box holding taco and teacup. Row3: blue magnetic swirl pulling tiny gold flecks; round dark seed bomb with short lit vine fuse; icy blue six-petal snow flower; translucent protective bubble with green leaf inside. Row4: golden wishing star with ribbon; blue hourglass containing gold sand; bright red comet with energizing tail; brown treasure chest with flower lock. Different shapes for all 16 cells.

## assets/interface-v2.png

參考：items-v4.png

提示詞：

Production game sprite atlas, true transparent background. EXACTLY 4 columns by 4 rows of equal SQUARE cells, 16 cells. Each entire object inside middle 65% of its cell, generous blank transparent gutters at least 17% on EVERY side. No neighboring shapes crossing cell borders. No labels, no text, no grid lines. Match reference TATA: thick slightly wobbly charcoal outline, flat pastel colors, simple cute handdrawn doodle, NO watercolor or elaborate rendering. Each cell is distinctly different. Row1: brown speaker with two mint sound waves (sound ON); same style speaker with a small charcoal cross (sound OFF); two pastel green PAUSE bars in cream button; sage green PLAY triangle in cream button. Row2: two orange fast-forward triangles; four green outward fullscreen corner arrows; cream dice with pastel flower pips; golden trophy with pink flower on cup. Row3: golden flower coin; pink heart with tiny green leaf (health); small gold padlock; ornate simple green key. Row4: two little charcoal footprint paws; leaf-tipped exclamation warning sign; crossed green and peach victory flags; sleeping cream cloud with blue nightcap. No words or letters except simple exclamation and X symbol.

## assets/friends-motion-v2.png

參考：characters-v4.png

提示詞：

Create a TRUE TRANSPARENT character animation sprite atlas EXACT 4 columns x 4 rows of equal SQUARE cells. Reference character identities faithfully. Rows TOP to BOTTOM are TATA long Y-forked horn white beetle with pink cheeks; Bito short wide crescent horn beetle brown cheeks; Kashun tiny round white bug with radial dark legs and yellow cheeks; Cupid crescent-horn beetle with brown cheeks curled grey wings yellow halo. Columns LEFT to RIGHT: full body relaxed idle; walking left stride with left foot forward right foot back and torso lean; opposite walking stride; full-body joyful attack with flower petals (TATA), taco toss (Bito), star punch (Kashun), heart bow (Cupid). COMPLETE abdomen/round lower body, arms, horns, feet, wings and ALL attack props and effects must fit INSIDE middle 65% of each cell. At least 17% transparent margin every side. No cropped bodies, no body severed by horizontal edges. Thick charcoal doodle outlines, very simple flat pastel fill, dot eyes dash mouth blush. NO realistic shading, no grid, no labels, no text. Preserve each character's same scale and body anatomy across all four columns.

## assets/costumes-motion-v2.png

參考：costumes.png

提示詞：

Create a TRUE TRANSPARENT character animation sprite atlas EXACT 4 columns x 4 rows of equal SQUARE cells. Reference outfit identities faithfully: white beetle TATA tall Y forked horn, dot eyes dash mouth pink cheeks charcoal outline. Rows TOP to BOTTOM: mint explorer scarf and satchel; purple star wizard cape and wand; blue raincoat and cloud umbrella; peach apron gardener with flowerpot. Columns LEFT to RIGHT: FULL-BODY idle; walking left stride one foot forward; opposite walking stride other foot forward; dynamic full-body attack throwing leaf boomerang (explorer), star casting (wizard), umbrella swing and raindrops (raincoat), flowerpot petal spell (gardener). All COMPLETE lower abdomen, legs, horns, hands, costumes, props and attack effects must stay within central 65% of each equal square cell, at least 17% EMPTY transparent margin all sides. DO NOT crop bodies or props. Simple flat colors and thick wobbly charcoal outline exactly reference. No labels, text or grid. Same character size and anatomy in all four columns.
