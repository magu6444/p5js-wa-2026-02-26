let creatures = [];
const numCreatures = 50; // 画面内のキャラクター数
let audioStarted = false;
let panicSound; // パニック時に再生するサウンドオブジェクト

// 高速タッチ検知用の変数
let touchTimestamps = [];
const touchThreshold = 10; // 1秒間に10回以上のタッチ

// 視覚的フィードバック用の変数
let ripples = [];

// サウンドの状態管理用
let panicSoundWasPlaying = false;

// 音源ファイルを読み込みます
function preload() {
    panicSound = loadSound('se_drumroll03.mp3');
}

// 初期設定
function setup() {
    createCanvas(windowWidth, windowHeight);

    // キャラクターを生成
    for (let i = 0; i < numCreatures; i++) {
        if (random() > 0.2) {
            creatures.push(new Person());
        } else {
            creatures.push(new Dog());
        }
    }
}

// 毎フレームの描画処理
function draw() {
    background(255);

    // ドラムロールが終了した瞬間に全キャラクターのパニック状態をリセット
    // (更新処理の前にこれを行うことで、停止タイミングを完璧に同期させる)
    if (panicSoundWasPlaying && !panicSound.isPlaying()) {
        for (let creature of creatures) {
            creature.scareTimer = 0;
        }
    }
    // 現在の状態を記録
    panicSoundWasPlaying = panicSound.isPlaying();

    // タッチによるパニック判定
    let now = millis();
    // 1秒以上前のタイムスタンプを削除
    touchTimestamps = touchTimestamps.filter(t => now - t < 1000);

    // 2本指以上かつ、1秒間のタッチ回数が閾値を超えている場合
    if (touches.length >= 2 && touchTimestamps.length >= touchThreshold) {
        if (!panicSound.isPlaying()) {
            panicSound.play(); // 条件達成時に1回再生（最後まで流し切る）
            for (let creature of creatures) {
                creature.frighten(panicSound.duration()); // サウンドの長さに合わせてパニック
            }
        }
    }

    // 全てのキャラクターを更新して表示
    for (let creature of creatures) {
        creature.update();
        creature.display();
    }

    // 波紋エフェクトの描画と更新
    for (let i = ripples.length - 1; i >= 0; i--) {
        let r = ripples[i];
        noFill();
        stroke(0, 0, 0, r.alpha);
        strokeWeight(2);
        ellipse(r.x, r.y, r.d, r.d);
        r.d += 4;
        r.alpha -= 10;
        if (r.alpha <= 0) {
            ripples.splice(i, 1);
        }
    }

    // サウンドが再生中の場合のみ文字を表示
    if (panicSound.isPlaying()) {
        fill(0);
        textSize(64);
        textStyle(ITALIC);
        textAlign(CENTER, TOP);
        text('「わーっ！」', width / 2, 20);
    }

    // オーディオが開始されていない場合、クリックを促すメッセージを表示
    if (!audioStarted) {
        // 背景を真っ黒に
        background(0);

        // 文字の代わりにマウスカーソルのイラストを描画します
        push();
        translate(width / 2, height / 2);
        // カーソルのサイズを小さくしました
        scale(1.5);
        fill(255);
        stroke(0);
        strokeWeight(1.5);

        beginShape();
        vertex(-8, -12);
        vertex(-8, 10);
        vertex(-2, 4);
        vertex(3, 14);
        vertex(5, 12);
        vertex(0, 2);
        vertex(7, 1);
        endShape(CLOSE);

        pop();

        fill(255);
        noStroke();
        textSize(24);
        textAlign(CENTER, CENTER);
        text('Touch to Start', width / 2, height / 2 + 80);
    }
}

// ユーザーのクリックでオーディオを開始する
function mousePressed() {
    if (!audioStarted) {
        userStartAudio();
        audioStarted = true;
    }
    // クリック地点をパニックに（座標を確実に取得）
    triggerLocalPanic(mouseX, mouseY);
}

// タッチ開始時（iPad用）
function touchStarted() {
    if (!audioStarted) {
        userStartAudio();
        audioStarted = true;
    }

    // タイムスタンプを記録
    touchTimestamps.push(millis());

    // タッチした全ての場所の近くにいるキャラクターを慌てさせる
    if (touches && touches.length > 0) {
        for (let i = 0; i < touches.length; i++) {
            triggerLocalPanic(touches[i].x, touches[i].y);
        }
    } else {
        // touches配列が空の場合でも、現在の座標で判定
        triggerLocalPanic(mouseX, mouseY);
    }

    return false; // デフォルトの動作を防止
}

// 特定の座標の近くにいるキャラクターを慌てさせる共通関数
function triggerLocalPanic(x, y) {
    // 波紋を追加（視覚的フィードバック）
    ripples.push({ x: x, y: y, d: 20, alpha: 150 });

    for (let creature of creatures) {
        let d = dist(x, y, creature.pos.x, creature.pos.y);
        if (d < 150) { // 範囲を150pxに拡大
            creature.frighten(1.5);
        }
    }
}


function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}


// Creature: 全キャラクターの基本となるクラス
class Creature {
    constructor() {
        this.pos = createVector(random(width), random(height));
        this.size = random(25, 40);
        this.scareTimer = 0;

        // 通常時の歩行パターンをランダムに決定
        this.walkPattern = floor(random(4));
        this.walkSpeed = createVector(0, 0);
        this.setRandomWalkSpeed();
    }

    // ランダムな歩行速度を設定
    setRandomWalkSpeed() {
        const speed = random(0.2, 0.8); // 歩行スピードを遅くしました
        switch (this.walkPattern) {
            case 0: // 上下に歩く
                this.walkSpeed = createVector(0, random([-speed, speed]));
                break;
            case 1: // 左右に歩く
                this.walkSpeed = createVector(random([-speed, speed]), 0);
                break;
            case 2: // 水平・垂直に歩く
                if (random() > 0.5) {
                    this.walkSpeed = createVector(0, random([-speed, speed]));
                } else {
                    this.walkSpeed = createVector(random([-speed, speed]), 0);
                }
                break;
            case 3: // ランダムに歩く
                this.walkSpeed = p5.Vector.random2D().mult(speed);
                break;
        }
    }

    // パニック中かどうかの判定（サウンド再生中、または個別タイマが有効な場合）
    isPanicking() {
        return panicSound.isPlaying() || this.scareTimer > 0;
    }

    // 驚いた時の処理
    frighten(durationInSeconds) {
        // 秒数をフレーム数に変換 (60fpsを想定)
        this.scareTimer = durationInSeconds * 60;
    }

    // 状態の更新
    update() {
        // 音が鳴っているか、タイマーがある間はパニック動作
        if (this.isPanicking()) {
            this.panic();
            if (this.scareTimer > 0) {
                this.scareTimer--;
            }
        } else {
            this.walk();
        }
        this.constrainToScreen();
    }

    // 通常時の歩行
    walk() {
        this.pos.add(this.walkSpeed);
        // たまに方向転換
        if (frameCount % 100 === 0 && random() > 0.8) {
            this.setRandomWalkSpeed();
        }
    }

    // パニック時の動き（サブクラスで具体的に実装）
    panic() {
        // to be overridden
    }

    // 画面外に出ないようにする
    constrainToScreen() {
        if (this.pos.x > width + this.size) this.pos.x = -this.size;
        if (this.pos.x < -this.size) this.pos.x = width + this.size;
        if (this.pos.y > height + this.size) this.pos.y = -this.size;
        if (this.pos.y < -this.size) this.pos.y = height + this.size;
    }
}


// Person: 棒人間のクラス
class Person extends Creature {
    constructor() {
        super();
        this.panicMode = floor(random(3)); // 3つのパニックパターン
        this.runSpeed = random(8, 15);
        // 30%の確率で子供サイズにする
        if (random() < 0.3) {
            this.size = random(15, 24);
        }
    }

    panic() {
        switch (this.panicMode) {
            case 0: // すごい勢いで走り去る
                let fleeVector = p5.Vector.random2D().mult(this.runSpeed);
                this.pos.add(fleeVector);
                break;
            case 1: // その場で大混乱
                this.pos.x += random(-5, 5);
                this.pos.y += random(-5, 5);
                break;
            case 2: // 変な動き（ぐるぐる回る）
                let angle = frameCount * 0.5;
                this.pos.x += cos(angle) * 5;
                this.pos.y += sin(angle) * 5;
                break;
        }
    }

    display() {
        push();
        translate(this.pos.x, this.pos.y);
        stroke(0);
        strokeWeight(3);
        noFill();

        const s = this.size;
        // 頭のサイズを小さくしました
        ellipse(0, -s * 0.35, s * 0.3, s * 0.3); // 頭
        line(0, -s * 0.2, 0, s * 0.2); // 体

        if (this.isPanicking()) { // パニック中の手足
            let angle = frameCount * 0.5;
            line(0, 0, -s * 0.3 * cos(angle), -s * 0.3 * sin(angle)); // 左腕
            line(0, 0, s * 0.3 * cos(angle), s * 0.3 * sin(angle)); // 右腕
            line(0, s * 0.2, -s * 0.4 * cos(angle), s * 0.5 * sin(angle)); // 左足
            line(0, s * 0.2, s * 0.4 * cos(angle), s * 0.5 * sin(angle)); // 右足
        } else { // 歩いている時の手足
            // 足の動きが自然に見えるように修正しました
            const walkCycle = sin(frameCount * 0.08 + this.pos.x / 10);
            const armSwing = walkCycle * s * 0.15;
            const legSwing = walkCycle * s * 0.25;

            // 腕
            line(0, 0, -armSwing, s * 0.2); // 左腕
            line(0, 0, armSwing, s * 0.2);  // 右腕

            // 足
            line(0, s * 0.2, legSwing, s * 0.5);   // 左足
            line(0, s * 0.2, -legSwing, s * 0.5);  // 右足
        }
        pop();
    }
}

// Dog: 犬のクラス
class Dog extends Creature {
    constructor() {
        super();
        this.size = random(20, 30);
    }

    panic() { // 吠える動き
        this.pos.x += random(-3, 3);
        this.pos.y += random(-3, 3);
    }

    display() {
        push();
        translate(this.pos.x, this.pos.y);
        stroke(0);
        strokeWeight(3);
        noFill();

        const s = this.size;
        const d = this.walkSpeed.x > 0 ? 1 : -1;

        if (this.isPanicking()) { // パニック中の描画
            const barkAnim = sin(frameCount * 0.9);
            line(-s * 0.4 * d, barkAnim, s * 0.4 * d, 0); // 体
            ellipse(s * 0.5 * d + barkAnim * 2, -s * 0.1, s * 0.3, s * 0.3); // 頭
            line(-s * 0.4 * d, 0, -s * 0.6 * d, -s * 0.2 + sin(frameCount * 1.2) * 4); // 尻尾
        } else { // 通常時の描画
            line(-s * 0.4 * d, 0, s * 0.4 * d, 0); // 体
            ellipse(s * 0.5 * d, -s * 0.1, s * 0.3, s * 0.3); // 頭
            line(-s * 0.4 * d, 0, -s * 0.6 * d, -s * 0.2); // 尻尾
        }

        const legCycle = frameCount * 0.2;
        line(-s * 0.2 * d, 0, -s * 0.3 * d, s * 0.3 + sin(legCycle + PI) * 3);
        line(s * 0.2 * d, 0, s * 0.3 * d, s * 0.3 + sin(legCycle) * 3);
        pop();
    }
}

