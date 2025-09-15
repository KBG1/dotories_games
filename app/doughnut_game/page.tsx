'use client'
import React, { useEffect, useRef } from 'react'

function Game2() {
  const gameInitialized = useRef(false)

  useEffect(() => {
    if (gameInitialized.current) return
    gameInitialized.current = true

    // Matter.js를 동적으로 import하여 SSR 문제 해결
    // DOM이 완전히 로드될 때까지 기다림
    const initGame = () => {
      import('matter-js').then((Matter) => {
        // DOM 요소들이 모두 렌더링되었는지 확인
        const checkDOM = () => {
          const requiredElements = ['score', 'best', 'speedDisp', 'failMessage', 'failReason', 'bestInFail', 'resetButton', 'startMessage', 'startButton']
          const allExists = requiredElements.every(id => document.getElementById(id))

          if (allExists) {
            initializeGame(Matter.default)
          } else {
            // DOM이 아직 준비되지 않았으면 잠시 후 다시 시도
            setTimeout(checkDOM, 100)
          }
        }
        checkDOM()
      }).catch((error) => {
        console.error('Matter.js 로드 실패:', error)
      })
    }

    // 컴포넌트가 완전히 마운트된 후 게임 초기화
    setTimeout(initGame, 50)

    // 브라우저 뒤로가기/새로고침 감지
    const handleBeforeUnload = () => {
      if (typeof window !== 'undefined') {
        const gameCleanup = (window as typeof window & { gameCleanup?: () => void }).gameCleanup
        if (gameCleanup) gameCleanup()
      }
    }

    const handlePopState = () => {
      if (typeof window !== 'undefined') {
        const gameCleanup = (window as typeof window & { gameCleanup?: () => void }).gameCleanup
        if (gameCleanup) gameCleanup()
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('popstate', handlePopState)

    return () => {
      // 클린업
      if (typeof window !== 'undefined') {
        const gameCleanup = (window as typeof window & { gameCleanup?: () => void }).gameCleanup
        if (gameCleanup) gameCleanup()
      }
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  const initializeGame = (Matter: typeof import('matter-js')) => {
    const { Engine, Render, Runner, Bodies, Body, Composite, Events } = Matter

    // 게임 설정 - 화면 크기에 따라 동적으로 계산
    function getGameSettings() {
      const screenWidth = window.innerWidth
      const screenHeight = window.innerHeight
      const baseWidth = Math.min(screenWidth, screenHeight) * 0.12 // 화면 크기의 12%
      
      // 화면 너비에 따른 속도 조정 (조금 더 빠르게)
      const baseSpeed = Math.max(4, Math.min(4, screenWidth / 250)) // 2~4 사이로 제한 (약간 빠르게)
      
      // 화면 크기에 따른 물리 설정 (작은 화면일수록 안정적으로)
      const sizeRatio = Math.min(screenWidth, screenHeight) / 800 // 800px 기준
      const physicsScale = Math.max(0.5, Math.min(1.2, sizeRatio)) // 0.5~1.2 배율
      
      return {
        donut: {
          width: baseWidth * 1.5,
          height: baseWidth * 0.75, // 가로:세로 = 2:1 비율
          tolerance: baseWidth * 0.6, // 허용 범위
        },
        speed: {
          start: baseSpeed,
          increment: baseSpeed * 0.015, // 시작 속도의 1.5%씩 증가 (천천히 증가)
        },
        physics: {
          gravity: 2 * physicsScale, // 중력 대폭 증가 (1.0 → 1.8)
          density: 1 * physicsScale, // 밀도 더 증가로 빠른 낙하
          friction: Math.max(0.6, 0.7 + (1 - physicsScale) * 0.3), // 마찰력 유지
          restitution: Math.max(0.05, 0.2 * physicsScale), // 튕김 유지
        }
      }
    }

    // 물리 설정은 동적으로 계산되므로 제거
    // 속도는 동적으로 계산되므로 제거
    const DROP_COOLDOWN_MS = 800
    const STABLE_SPEED_EPS = 0.1
    const STABLE_ANGVEL_EPS = 0.01
    const DONUT_SPRITE_URL = "/doughnut.png" // public 폴더의 이미지 경로

    let engine: Matter.Engine, world: Matter.World, render: Matter.Render, runner: Matter.Runner
    let ground: Matter.Body, leftWall: Matter.Body, rightWall: Matter.Body
    let movingDonut: Matter.Body | null = null
    let direction = 1
    let speed = getGameSettings().speed.start

    let stackCenterX: number | null = null
    let donutStack: Matter.Body[] = []
    let gameOver = false
    let started = false
    let score = 0
    let best = Number(localStorage.getItem("donut_best") || 0)
    let nextDonutReady = false

    // DOM 요소들을 안전하게 가져오기
    const $score = document.getElementById('score')
    const $best = document.getElementById('best')
    const $speedDisp = document.getElementById('speedDisp')
    const $failMessage = document.getElementById('failMessage')
    const $failReason = document.getElementById('failReason')
    const $bestInFail = document.getElementById('bestInFail')
    const $resetButton = document.getElementById('resetButton')
    const $startMessage = document.getElementById('startMessage')
    const $startButton = document.getElementById('startButton')

    // DOM 요소가 존재하지 않으면 게임 초기화 중단
    if (!$score || !$best || !$speedDisp || !$failMessage || !$failReason || !$bestInFail || !$resetButton || !$startMessage || !$startButton) {
      console.error('게임 UI 요소를 찾을 수 없습니다. DOM이 완전히 로드되었는지 확인하세요.')
      return
    }

    if ($best) $best.textContent = String(best)
    if ($speedDisp) $speedDisp.textContent = speed.toFixed(1)

    // 유틸
    const rad2deg = (r: number) => r * 180 / Math.PI

    // 월드/렌더 생성
    function createEngineAndRender() {
      engine = Engine.create()
      world = engine.world
      
      const gameSettings = getGameSettings()
      engine.world.gravity.y = gameSettings.physics.gravity
      engine.timing.timeScale = 1.0

      render = Render.create({
        element: document.body,
        engine,
        options: {
          width: window.innerWidth,
          height: window.innerHeight,
          wireframes: false,
          background: '#f8f9fa',
          pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
          showVelocity: false,
          showAngleIndicator: false,
          showCollisions: false
        }
      })
      Render.run(render)
      runner = Runner.create()
      Runner.run(runner, engine)

      setupBoundaries()
    }

    function setupBoundaries() {
      const w = window.innerWidth
      const h = window.innerHeight

      ground = Bodies.rectangle(w/2, h-18, w+200, 36, { 
        isStatic: true, 
        friction: 1.0,
        render:{ fillStyle: '#2c3e50' }
      })
      leftWall = Bodies.rectangle(-40, h/2, 80, h*2, { isStatic: true, render:{ visible:false }})
      rightWall = Bodies.rectangle(w+40, h/2, 80, h*2, { isStatic: true, render:{ visible:false }})
      Composite.add(world, [ground, leftWall, rightWall])
    }

    // 도넛 생성/이동/드롭
    function createMovingDonut() {
      if (movingDonut) return // 이미 있으면 생성하지 않음
      
      const w = window.innerWidth
      const gameSettings = getGameSettings() // 동적 설정 계산
      const donutSize = gameSettings.donut
      const startX = Math.random() < 0.5 ? donutSize.width : w - donutSize.width
      const startY = 150

      const donut = Bodies.rectangle(startX, startY, donutSize.width, donutSize.height, {
        isStatic: true,
        density: gameSettings.physics.density,
        friction: gameSettings.physics.friction,
        restitution: gameSettings.physics.restitution,
        // inertia: Infinity, // 회전 허용으로 변경
        render: DONUT_SPRITE_URL ? {
          sprite: { 
            texture: DONUT_SPRITE_URL, 
            xScale: donutSize.width/200, 
            yScale: donutSize.height/200 
          }
        } : {
          fillStyle: '#f39c12', 
          strokeStyle: '#e67e22', 
          lineWidth: 3
        }
      })

      movingDonut = donut
      Composite.add(world, donut)
      direction = (startX < window.innerWidth / 2) ? 1 : -1
      nextDonutReady = true
    }

    function dropDonut() {
      if (gameOver || !started || !movingDonut || !nextDonutReady) return

      // 현재 위치 저장 (static 상태일 때의 위치)
      const currentX = movingDonut.position.x
      const currentY = movingDonut.position.y

      console.log('Drop position:', currentX, currentY) // 디버깅용

      // 첫 번째 도넛이면 스택 중심 설정
      if (stackCenterX === null) {
        stackCenterX = currentX
      }

      // 새로운 도넛을 같은 위치에 생성 (기존 방식 변경)
      const gameSettings = getGameSettings()
      const droppedDonut = Bodies.rectangle(currentX, currentY, gameSettings.donut.width, gameSettings.donut.height, {
        isStatic: false, // 처음부터 dynamic으로 생성
        density: gameSettings.physics.density,
        friction: gameSettings.physics.friction,
        restitution: gameSettings.physics.restitution,
        render: DONUT_SPRITE_URL ? {
          sprite: { 
            texture: DONUT_SPRITE_URL, 
            xScale: gameSettings.donut.width/200, 
            yScale: gameSettings.donut.height/200 
          }
        } : {
          fillStyle: '#f39c12', 
          strokeStyle: '#e67e22', 
          lineWidth: 3
        }
      })

      // 기존 움직이는 도넛 제거
      Composite.remove(world, movingDonut)
      
      // 새 도넛을 월드에 추가
      Composite.add(world, droppedDonut)
      donutStack.push(droppedDonut)
      
      movingDonut = null
      nextDonutReady = false
    }

    // 실패/성공 판정
    function isSleeping(body: Matter.Body) {
      return body && !body.isStatic &&
             Math.hypot(body.velocity.x, body.velocity.y) < STABLE_SPEED_EPS &&
             Math.abs(body.angularVelocity) < STABLE_ANGVEL_EPS
    }

    function checkTowerStability() {
      if (donutStack.length === 0) return { stable: true }

      const donutSize = getGameSettings().donut // 동적 크기 가져오기

      for (const donut of donutStack) {
        if (!donut) continue

        // 바닥 밖으로 완전히 떨어진 도넛만 실패 처리
        if (donut.position.y > window.innerHeight + donutSize.height * 2) {
          return { stable: false, reason: '도넛탑이 무너졌어요!' }
        }

        // 도넛이 2개 이상일 때만 한 줄 체크 (첫 도넛은 어디든 OK)
        if (donutStack.length >= 2 && stackCenterX !== null) {
          const dx = Math.abs(donut.position.x - stackCenterX)
          if (dx > donutSize.tolerance * 1.5) { // 더 관대하게
            return { stable: false, reason: '한 줄에서 벗어났어요!' }
          }
        }

        // 완전히 뒤집어진 도넛만 실패 (90도 이상)
        const angleDeg = Math.abs(rad2deg(donut.angle))
        if (angleDeg > 80) {
          return { stable: false, reason: '도넛이 넘어졌어요!' }
        }
      }
      
      return { stable: true }
    }

    function showFail(reasonText?: string) {
      gameOver = true
      if ($failReason) $failReason.textContent = reasonText || '탑이 무너졌어요.'
      if ($bestInFail) $bestInFail.textContent = String(best)
      if ($failMessage) $failMessage.style.display = 'block'
    }

    // 스코어/난이도
    function onSuccessfulPlace() {
      score += 1
      if ($score) $score.textContent = String(score)
      if (score > best) {
        best = score
        localStorage.setItem('donut_best', String(best))
        if ($best) $best.textContent = String(best)
      }
      const gameSettings = getGameSettings()
      const maxSpeed = gameSettings.speed.start * 2.0 // 시작 속도의 2배까지 (최대 속도도 제한)
      speed = Math.min(gameSettings.speed.start + score * gameSettings.speed.increment, maxSpeed)
      if ($speedDisp) $speedDisp.textContent = speed.toFixed(1)
      
      // 성공 시 시각적 피드백
      if ($score) {
        $score.style.color = 'var(--ok)'
        setTimeout(() => {
          if ($score) $score.style.color = ''
        }, 300)
      }
    }

    // 루프 이벤트
    function attachEngineEvents() {
      // 좌우 이동
      Events.on(engine, 'beforeUpdate', () => {
        if (gameOver) return

        if (movingDonut && movingDonut.isStatic) {
          Body.translate(movingDonut, { x: speed * direction, y: 0 })

          const donutSize = getGameSettings().donut
          const margin = donutSize.width / 2 + 10
          if (movingDonut.position.x > window.innerWidth - margin || movingDonut.position.x < margin) {
            direction *= -1
          }
        }
        
        // 회전 제어 (너무 강하지 않게)
        donutStack.forEach(donut => {
          if (donut && !donut.isStatic) {
            // 회전 속도만 줄이고, 각도는 자연스럽게 유지
            if (Math.abs(donut.angularVelocity) > 0.1) {
              Body.setAngularVelocity(donut, donut.angularVelocity * 0.8)
            }
          }
        })
      })

      // 안정화 및 실패 판정
      Events.on(engine, 'afterUpdate', () => {
        if (gameOver) return

        // 타워 안정성 체크
        const stability = checkTowerStability()
        if (!stability.stable) {
          showFail(stability.reason as string)
          return
        }

        // 안정화 체크
        for (const donut of donutStack) {
          if (!donut || donut.isStatic) continue

          if (isSleeping(donut)) {
            if (!(donut as Matter.Body & { hasScored?: boolean }).hasScored) {
              (donut as Matter.Body & { hasScored?: boolean }).hasScored = true
              onSuccessfulPlace()
              
              // 다음 도넛 생성
              setTimeout(() => {
                if (!gameOver) createMovingDonut()
              }, DROP_COOLDOWN_MS)
            }
          }
        }
      })
    }

    // 시작/리셋/입력
    function startGame() {
      if (started) return
      started = true
      gameOver = false
      score = 0
      speed = getGameSettings().speed.start
      donutStack = []
      stackCenterX = null
      nextDonutReady = false
      
      if ($score) $score.textContent = String(score)
      if ($speedDisp) $speedDisp.textContent = speed.toFixed(1)
      if ($startMessage) $startMessage.style.display = 'none'
      if ($failMessage) $failMessage.style.display = 'none'

      createMovingDonut()
    }

    function resetGame() {
      try {
        Render.stop(render)
        Runner.stop(runner)
        render.canvas.remove()
        render.textures = {}
      } catch(e){ console.error('Render cleanup error:', e) }

      Composite.clear(engine.world, false)
      // engine.events 초기화는 타입 문제로 주석 처리
      // ;(engine as any).events = {}

      donutStack = []
      stackCenterX = null
      movingDonut = null
      started = false
      gameOver = false
      speed = getGameSettings().speed.start
      nextDonutReady = false
      
      if ($score) $score.textContent = '0'
      if ($speedDisp) $speedDisp.textContent = speed.toFixed(1)

      createEngineAndRender()
      attachEngineEvents()

      if ($failMessage) $failMessage.style.display = 'none'
      if ($startMessage) $startMessage.style.display = 'block'
    }

    function handleClick() {
      if (!started) {
        startGame()
      } else {
        dropDonut()
      }
    }

    // 이벤트 리스너
    const clickHandler = handleClick
    const resizeHandler = onResize
    
    window.addEventListener('click', clickHandler)
    if ($startButton) {
      $startButton.addEventListener('click', (e) => {
        e.stopPropagation()
        startGame()
      })
    }
    if ($resetButton) {
      $resetButton.addEventListener('click', resetGame)
    }

    // 리사이즈
    function onResize() {
      if (!render) return
      const w = window.innerWidth, h = window.innerHeight
      render.canvas.width = w
      render.canvas.height = h
      render.options.width = w
      render.options.height = h

      Body.setPosition(ground, { x: w/2, y: h - 18 })
      Body.setVertices(ground, Bodies.rectangle(w/2, h-18, w+200, 36).vertices)
      Body.setPosition(leftWall, { x:-40, y:h/2 })
      Body.setPosition(rightWall, { x:w+40, y:h/2 })
    }
    window.addEventListener('resize', resizeHandler)

    // 부트스트랩
    createEngineAndRender()
    attachEngineEvents()
    if ($startMessage) $startMessage.style.display = 'block'

    // 클린업 함수를 window에 저장
    ;(window as typeof window & { gameCleanup?: () => void }).gameCleanup = () => {
      try {
        window.removeEventListener('click', clickHandler)
        window.removeEventListener('resize', resizeHandler)
        if (render) {
          Render.stop(render)
          render.canvas?.remove()
        }
        if (runner) Runner.stop(runner)
      } catch(e) {
        console.error('Cleanup error:', e)
      }
    }
  }

  return (
    <>
      <style jsx global>{`
        :root {
          --bg:#fafafa;
          --fg:#2c3e50;
          --accent:#ff6b6b;
          --ok:#2ecc71;
        }
        html, body { height:100%; }
        body { 
          margin:0; overflow:hidden; background:var(--bg); touch-action:none; 
          font-family:system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
          overscroll-behavior: none; /* 스크롤 경고 메시지 방지 */
        }
        canvas { display:block; }

        /* HUD */
        .hud {
          position:fixed; left:50%; top:14px; transform:translateX(-50%);
          display:flex; gap:8px; align-items:center; flex-wrap:wrap; justify-content:center;
          background:rgba(255,255,255,.95); padding:8px 12px; border-radius:16px;
          box-shadow:0 6px 20px rgba(0,0,0,.1);
          user-select:none; font-weight:600;
          border:1px solid rgba(255,255,255,.2);
          max-width:90vw;
        }
        
        /* 뒤로가기 버튼 */
        .back-btn {
          position:fixed; left:14px; top:14px;
          width:40px; height:40px; border-radius:50%;
          background:rgba(255,255,255,.95); border:1px solid rgba(255,255,255,.2);
          box-shadow:0 6px 20px rgba(0,0,0,.1);
          display:flex; align-items:center; justify-content:center;
          cursor:pointer; font-size:1.2rem; color:var(--fg);
          transition:all 0.2s ease;
        }
        .back-btn:hover {
          transform:translateY(-2px); 
          box-shadow:0 8px 24px rgba(0,0,0,.15);
        }
        .pill { 
          padding:4px 8px; border-radius:999px; background:#fff; 
          border:1px solid #eee; font-size:0.8rem;
          box-shadow:0 2px 8px rgba(0,0,0,.05);
          white-space:nowrap;
        }
        
        /* 모바일 대응 */
        @media (max-width: 480px) {
          .hud {
            gap:4px; padding:6px 8px; top:8px;
          }
          .pill {
            padding:3px 6px; font-size:0.75rem;
          }
          .back-btn {
            left:8px; top:8px; width:36px; height:36px; font-size:1rem;
          }
        }
        .good { color:var(--ok); font-weight:700; }
        .bad { color:var(--accent); font-weight:700; }

        /* Messages */
        #messageWrap {
          position:fixed; inset:0; display:flex; align-items:center; justify-content:center; pointer-events:none;
        }
        #failMessage, #startMessage {
          display:none; text-align:center; pointer-events:auto;
          background:rgba(255,255,255,.98); padding:32px 36px; border-radius:20px; 
          box-shadow:0 15px 40px rgba(0,0,0,.15);
          border:1px solid rgba(255,255,255,.3);
          max-width:90vw; margin:20px;
        }
        #failMessage h1, #startMessage h1 { margin:.2em 0; font-size:2.4rem; font-weight:700; }
        #failMessage p, #startMessage p { margin:.4em 0 1.5em; opacity:.8; line-height:1.5; }
        .btn {
          font-size:1.1rem; padding:.8em 1.6em; border-radius:14px; border:none; cursor:pointer;
          background:var(--fg); color:#fff; font-weight:600;
          transition:all 0.2s ease; box-shadow:0 4px 12px rgba(44,62,80,.3);
        }
        .btn:hover { transform:translateY(-2px); box-shadow:0 6px 16px rgba(44,62,80,.4); }
        
        /* 모바일 메시지 대응 */
        @media (max-width: 480px) {
          #failMessage, #startMessage {
            padding:20px 24px; margin:10px;
          }
          #failMessage h1, #startMessage h1 { 
            font-size:1.8rem; 
          }
          #failMessage p, #startMessage p { 
            font-size:0.9rem; 
          }
          .btn {
            font-size:1rem; padding:.7em 1.4em;
          }
        }
      `}</style>
      
      {/* 뒤로가기 버튼 */}
      <div className="back-btn" onClick={() => window.history.back()}>
        ←
      </div>
      
      <div className="hud" id="hud">
        <span className="pill">높이 <span id="score">0</span></span>
        <span className="pill">최고 <span id="best">0</span></span>
        <span className="pill">속도 <span id="speedDisp">8</span></span>
      </div>

      <div id="messageWrap">
        <div id="startMessage">
          <h1>🍩 한줄 도넛 쌓기</h1>
          <p>화면을 <b>클릭</b>하면 이동 중인 도넛이 떨어집니다.<br/>도넛을 <b>한 줄로 높이 쌓아서</b> 최고 기록을 세워보세요!</p>
          <button id="startButton" className="btn">🎮 시작하기</button>
        </div>
        <div id="failMessage">
          <h1 className="bad">💥 실패!</h1>
          <p id="failReason">탑이 무너졌어요.</p>
          <p style={{fontSize:'0.9rem', opacity:'0.7', marginTop:'1em'}}>최고 높이: <span id="bestInFail">0</span>개</p>
          <button id="resetButton" className="btn">🔄 다시 쌓기</button>
        </div>
      </div>
    </>
  )
}

export default Game2