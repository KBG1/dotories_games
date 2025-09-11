"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import Matter from 'matter-js';

function DonutStackingGame() {
  const gameRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Matter.Engine | null>(null);
  const renderRef = useRef<Matter.Render | null>(null);
  const animationRef = useRef<number>(0);
  const movingDonutRef = useRef<Matter.Body | null>(null);
  
  // 게임 상태
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [movingDirection, setMovingDirection] = useState(1);
  
  // 게임 설정
  const GAME_WIDTH = 800;
  const GAME_HEIGHT = 600;
  const DONUT_WIDTH = 140;
  const DONUT_HEIGHT = 40;
  const MOVE_SPEED = 2;

  // 도넛 생성 함수
  const createDonut = useCallback((x: number, y: number, isMoving = false) => {
    if (!engineRef.current) return null;
    
    const { Bodies, Body, Composite } = Matter;
    const world = engineRef.current.world;

    // 가로로 긴 도넛 생성
    const outer = Bodies.rectangle(x, y, DONUT_WIDTH, DONUT_HEIGHT, {
      chamfer: { radius: 20 },
      restitution: 0.1,
      friction: 0.8,
      density: 0.001,
      render: { 
        fillStyle: isMoving ? "#e74c3c" : "#f39c12", 
        strokeStyle: "#d35400", 
        lineWidth: 3 
      }
    });

    const donut = Body.create({
      parts: [outer],
      friction: 0.8,
      restitution: 0.1
    });

    Composite.add(world, donut);
    return donut;
  }, []);

  // 새로운 움직이는 도넛 생성
  const createMovingDonut = useCallback(() => {
    console.log('🔴 createMovingDonut 호출됨');
    if (!engineRef.current || !renderRef.current) {
      console.log('❌ engineRef 또는 renderRef가 없음:', { 
        engine: !!engineRef.current, 
        render: !!renderRef.current 
      });
      return;
    }
    
    const { Body } = Matter;
    
    // 현재 스택의 최고 높이 계산
    let topY = GAME_HEIGHT - 80; // 기본 위치
    const allBodies = Matter.Composite.allBodies(engineRef.current.world);
    const stackedDonuts = allBodies.filter(body => !body.isStatic && body !== movingDonutRef.current);
    
    if (stackedDonuts.length > 0) {
      topY = Math.min(...stackedDonuts.map(body => body.position.y)) - DONUT_HEIGHT - 50;
    }
    
    console.log('🔴 움직이는 도넛 위치:', { x: GAME_WIDTH / 2, y: topY });

    const movingDonut = createDonut(GAME_WIDTH / 2, topY, true);
    console.log('🔴 움직이는 도넛 생성 결과:', movingDonut);
    if (movingDonut) {
      Body.setStatic(movingDonut, true); // 움직이는 동안은 정적
      movingDonutRef.current = movingDonut;
      console.log('✅ 움직이는 도넛 설정 완료');
    }
  }, [createDonut]);

  // 게임 시작
  const startGame = useCallback(() => {
    console.log('🎮 게임 시작!');
    setGameStarted(true);
    setGameOver(false);
    setScore(1); // 기본 도넛 1개로 시작
    
    // 기본 도넛 생성 (바닥에)
    console.log('🍩 기본 도넛 생성 시도...');
    const baseDonut = createDonut(GAME_WIDTH / 2, GAME_HEIGHT - 60);
    console.log('🍩 기본 도넛 생성 결과:', baseDonut);
    
    // 첫 번째 움직이는 도넛 생성
    setTimeout(() => {
      console.log('🔴 움직이는 도넛 생성 시도...');
      createMovingDonut();
    }, 500);
  }, [createDonut, createMovingDonut]);

  // 도넛 떨어뜨리기
  const dropDonut = useCallback(() => {
    if (!movingDonutRef.current || gameOver) return;
    
    const { Body } = Matter;
    
    // 움직이는 도넛을 동적으로 변경
    Body.setStatic(movingDonutRef.current, false);
    movingDonutRef.current = null;
    
    // 점수 증가
    setScore(prev => prev + 1);
    
    // 새로운 움직이는 도넛 생성
    setTimeout(() => createMovingDonut(), 1000);
  }, [createMovingDonut, gameOver]);

  // Matter.js 엔진 초기화
  useEffect(() => {
    if (!gameRef.current) return;

    const { Engine, Render, Runner, Bodies, Composite } = Matter;

    // 엔진 생성
    const engine = Engine.create();
    engine.world.gravity.y = 1; // 중력 조정
    const world = engine.world;
    engineRef.current = engine;

    // 렌더러 생성
    const render = Render.create({
      element: gameRef.current,
      engine: engine,
      options: {
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
        wireframes: false,
        background: "#87CEEB"
      }
    });
    renderRef.current = render;

    Render.run(render);
    Runner.run(Runner.create(), engine);

    // 바닥
    const ground = Bodies.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 20, GAME_WIDTH, 40, {
      isStatic: true, 
      render: { fillStyle: "#8B4513" }
    });
    Composite.add(world, ground);

    // 클린업
    return () => {
      Render.stop(render);
      Engine.clear(engine);
      if (render.canvas && render.canvas.parentNode) {
        render.canvas.parentNode.removeChild(render.canvas);
      }
    };
  }, []);

  // 움직이는 도넛 애니메이션
  useEffect(() => {
    if (!gameStarted || gameOver || !movingDonutRef.current) return;

    const animate = () => {
      if (!movingDonutRef.current || !renderRef.current) return;
      
      const { Body } = Matter;
      const currentX = movingDonutRef.current.position.x;
      let newX = currentX + (MOVE_SPEED * movingDirection);
      
      // 벽 충돌 체크
      if (newX <= DONUT_WIDTH / 2) {
        newX = DONUT_WIDTH / 2;
        setMovingDirection(1);
      } else if (newX >= GAME_WIDTH - DONUT_WIDTH / 2) {
        newX = GAME_WIDTH - DONUT_WIDTH / 2;
        setMovingDirection(-1);
      }
      
      Body.setPosition(movingDonutRef.current, { x: newX, y: movingDonutRef.current.position.y });
      
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameStarted, gameOver, movingDirection]);

  // 균형 체크 및 게임오버 감지
  useEffect(() => {
    if (!gameStarted || gameOver || !engineRef.current) return;

    const checkBalance = () => {
      const allBodies = Matter.Composite.allBodies(engineRef.current!.world);
      const donuts = allBodies.filter(body => !body.isStatic && body !== movingDonutRef.current);
      
      // 도넛이 화면 밖으로 떨어졌는지 체크
      const outOfBounds = donuts.some(donut => 
        donut.position.y > GAME_HEIGHT + 100 || 
        donut.position.x < -100 || 
        donut.position.x > GAME_WIDTH + 100
      );

      // 도넛이 너무 기울어졌는지 체크 (각도)
      const tiltedTooMuch = donuts.some(donut => Math.abs(donut.angle) > Math.PI / 4); // 45도 이상

      if (outOfBounds || tiltedTooMuch) {
        setGameOver(true);
        if (score > highScore) {
          setHighScore(score);
        }
      }
    };

    const interval = setInterval(checkBalance, 100); // 100ms마다 체크
    return () => clearInterval(interval);
  }, [gameStarted, gameOver, score, highScore]);

  // 카메라 시스템 (높이 쌓이면 화면 이동)
  useEffect(() => {
    if (!gameStarted || !engineRef.current || !renderRef.current) return;

    const updateCamera = () => {
      const allBodies = Matter.Composite.allBodies(engineRef.current!.world);
      const donuts = allBodies.filter(body => !body.isStatic);
      
      if (donuts.length > 0) {
        const highestPoint = Math.min(...donuts.map(donut => donut.position.y));
        
        // 가장 높은 도넛이 화면 상단 1/3 지점보다 높으면 카메라 이동
        if (highestPoint < GAME_HEIGHT / 3) {
          const newCameraY = Math.max(0, GAME_HEIGHT / 3 - highestPoint);
          
          // Matter.js 렌더러의 뷰포트 조정
          if (renderRef.current) {
            renderRef.current.bounds.min.y = -newCameraY;
            renderRef.current.bounds.max.y = GAME_HEIGHT - newCameraY;
          }
        }
      }
    };

    const interval = setInterval(updateCamera, 50); // 50ms마다 카메라 업데이트
    return () => clearInterval(interval);
  }, [gameStarted]);

  // 클릭 이벤트 처리
  useEffect(() => {
    const handleClick = () => {
      if (!gameStarted) {
        startGame();
      } else if (!gameOver) {
        dropDonut();
      }
    };

    const canvas = renderRef.current?.canvas;
    if (canvas) {
      canvas.addEventListener('click', handleClick);
      return () => canvas.removeEventListener('click', handleClick);
    }
  }, [gameStarted, gameOver, startGame, dropDonut]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-400 to-pink-400 p-4">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="flex justify-between items-center mb-6">
          <Link href="/" className="text-white hover:text-purple-200 text-lg">
            ← 홈으로
          </Link>
          <h1 className="text-3xl font-bold text-white">🍩 도넛 균형 쌓기</h1>
          <div className="text-white text-right">
            <div className="text-xl font-semibold">쌓은 도넛: {score}개</div>
            <div className="text-sm">최고 기록: {highScore}개</div>
          </div>
        </div>

        {/* 게임 설명 */}
        <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 mb-6 text-white text-center">
          <p className="text-lg font-semibold mb-2">🎯 게임 방법</p>
          <p className="text-sm">
            • 화면을 클릭해서 움직이는 도넛을 떨어뜨리세요! <br/>
            • 균형을 잘 맞춰서 높이 쌓으세요! <br/>
            • 균형이 무너지면 게임 오버! ⚖️
          </p>
        </div>

        {/* 게임 영역 */}
        <div className="flex justify-center mb-6 relative">
          <div
            ref={gameRef}
            className="border-4 border-white rounded-lg shadow-2xl overflow-hidden cursor-pointer relative"
          />
          
          {/* 게임 시작 오버레이 */}
          {!gameStarted && (
            <div 
              className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg z-10 cursor-pointer"
              onClick={startGame}
            >
              <div className="bg-white rounded-lg p-8 text-center">
                <h2 className="text-3xl font-bold mb-4">🍩 도넛 쌓기 게임</h2>
                <p className="text-lg mb-6 text-gray-600">
                  클릭해서 게임을 시작하세요!
                </p>
                <div className="text-sm text-gray-500">
                  • 바닥에 기본 도넛 1개가 놓여있어요<br/>
                  • 움직이는 도넛을 클릭해서 떨어뜨리세요<br/>
                  • 균형을 맞춰서 높이 쌓아보세요!
                </div>
              </div>
            </div>
          )}

          {/* 게임 오버 오버레이 */}
          {gameOver && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center rounded-lg z-10">
              <div className="bg-white rounded-lg p-8 text-center">
                <h2 className="text-3xl font-bold mb-4">🎮 게임 오버!</h2>
                <p className="text-xl mb-2">쌓은 도넛: {score}개</p>
                {score > highScore && (
                  <p className="text-lg mb-4 text-green-600 font-bold">🎉 새로운 기록!</p>
                )}
                <p className="text-lg mb-6 text-gray-600">균형이 무너졌습니다! 😱</p>
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => {
                      setGameOver(false);
                      setGameStarted(false);
                      setScore(0);
                      // 엔진 리셋
                      if (engineRef.current) {
                        Matter.World.clear(engineRef.current.world, false);
                        const { Bodies, Composite } = Matter;
                        const ground = Bodies.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 20, GAME_WIDTH, 40, {
                          isStatic: true, 
                          render: { fillStyle: "#8B4513" }
                        });
                        Composite.add(engineRef.current.world, ground);
                      }
                    }}
                    className="px-6 py-3 bg-purple-500 text-white rounded-lg hover:bg-purple-600 font-bold"
                  >
                    다시 시작
                  </button>
                  <Link
                    href="/"
                    className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-bold"
                  >
                    홈으로
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 컨트롤 가이드 */}
        {gameStarted && !gameOver && (
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 text-white text-center">
            <p className="text-lg font-semibold">
              📱 화면을 클릭하여 도넛을 떨어뜨리세요!
            </p>
            <p className="text-sm mt-2">
              빨간 도넛이 좌우로 움직이고 있어요 ↔️
            </p>
          </div>
        )}

        {/* 기록 */}
        <div className="mt-6 bg-white/20 backdrop-blur-sm rounded-lg p-6 text-center">
          <h3 className="text-white font-bold text-xl mb-4">🏆 게임 기록</h3>
          <div className="grid grid-cols-2 gap-6 text-white">
            <div className="bg-white/10 rounded-lg p-4">
              <div className="text-3xl font-bold">{score}</div>
              <div className="text-sm">현재 도넛</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <div className="text-3xl font-bold">{highScore}</div>
              <div className="text-sm">최고 기록</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DonutStackingGame;