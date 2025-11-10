"use client";
import { useState, useEffect } from "react";
import data from "@/public/flip_card_game.json";
import Image from "next/image";

// 타입 정의
interface Card {
  id: number;
  name: string;
  src: string;
}

interface GameData {
  backImage: string;
  cards: Card[];
  difficulty: {
    easy: number;
    normal: number;
    hard: number;
  };
}

export default function FlipCardGame() {
  const gameData = data as GameData;
  const [showDifficultySelect, setShowDifficultySelect] = useState(true);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(
    null
  );
  const [gameCards, setGameCards] = useState<Card[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [matchedCards, setMatchedCards] = useState<number[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [showingCards, setShowingCards] = useState(false);
  const [countdown, setCountdown] = useState(3);

  // 난이도별 설정
  const DIFFICULTY_CONFIGS = {
    easy: { name: "쉬움", pairs: 4, cards: 8, coin: 5 },
    normal: { name: "보통", pairs: 8, cards: 16, coin: 8 },
    hard: { name: "어려움", pairs: 12, cards: 24, coin: 12 },
  };

  // 카드 섞기 함수
  const shuffleCards = (cards: Card[]) => {
    const shuffled = [...cards];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // 게임 시작
  const startGameWithDifficulty = (difficulty: string) => {
    const pairCount =
      gameData.difficulty[difficulty as keyof typeof gameData.difficulty];
    const selectedCards = gameData.cards.slice(0, pairCount * 2);
    const shuffled = shuffleCards(selectedCards);
    setGameCards(shuffled);
    setFlippedCards([]);
    setMatchedCards([]);
    setIsChecking(false);
    setGameCompleted(false);
    setShowDifficultySelect(false);
    setShowingCards(true);
    setCountdown(3);
  };

  // 카운트다운 및 카드 숨기기 로직
  useEffect(() => {
    if (showingCards && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (showingCards && countdown === 0) {
      setShowingCards(false);
    }
  }, [showingCards, countdown]);

  // 카드 클릭 처리
  const handleCardClick = (cardId: number) => {
    // 미리보기 중이거나, 이미 뒤집힌 카드거나, 매칭된 카드거나, 체크 중이면 무시
    if (
      showingCards ||
      flippedCards.includes(cardId) ||
      matchedCards.includes(cardId) ||
      isChecking ||
      flippedCards.length >= 2
    ) {
      return;
    }

    const newFlipped = [...flippedCards, cardId];
    setFlippedCards(newFlipped);

    // 두 장을 선택했을 때
    if (newFlipped.length === 2) {
      setIsChecking(true);
      const [firstId, secondId] = newFlipped;
      const firstCard = gameCards.find((c) => c.id === firstId);
      const secondCard = gameCards.find((c) => c.id === secondId);

      // 같은 카드인지 확인 (name으로 비교)
      if (firstCard?.name === secondCard?.name) {
        // 매칭 성공
        setMatchedCards([...matchedCards, firstId, secondId]);
        setFlippedCards([]);
        setIsChecking(false);
      } else {
        // 매칭 실패 - 1초 후 다시 뒤집기
        setTimeout(() => {
          setFlippedCards([]);
          setIsChecking(false);
        }, 1000);
      }
    }
  };

  // 게임 완료 체크
  useEffect(() => {
    if (gameCards.length > 0 && matchedCards.length === gameCards.length) {
      setTimeout(() => {
        setGameCompleted(true);
      }, 500);
    }
  }, [matchedCards, gameCards]);

  // 카드가 뒤집혀있는지 확인
  const isCardFlipped = (cardId: number) => {
    return (
      showingCards ||
      flippedCards.includes(cardId) ||
      matchedCards.includes(cardId)
    );
  };

  // 난이도 선택 화면
  if (showDifficultySelect) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: "#F5F1E8" }}>
        <style jsx global>{`
          body {
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
              sans-serif;
            touch-action: manipulation;
            overscroll-behavior: none;
          }
        `}</style>

        <div className="max-w-md mx-auto p-4">
          {/* 헤더 */}
          <div className="bg-white rounded-3xl p-6 mb-6 shadow-sm border border-gray-200">
            <div className="text-center">
              <div className="w-20 h-20 bg-red-400 rounded-full mx-auto mb-4 flex items-center justify-center">
                <div className="text-white text-4xl">🎴</div>
              </div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">
                카드 뒤집기 게임
              </h1>
              <p className="text-gray-600 text-sm mb-1">같은 그림을 찾아서</p>
              <p className="text-gray-600 text-sm">카드를 매칭해보세요!</p>
            </div>

            {/* 난이도 선택 */}
            <div className="mt-6">
              <h2 className="text-lg font-bold text-gray-800 text-center mb-4">
                난이도 선택
              </h2>
              <div className="space-y-3">
                {Object.entries(DIFFICULTY_CONFIGS).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedDifficulty(key)}
                    className={`w-full p-4 rounded-2xl transition-all ${
                      selectedDifficulty === key
                        ? "bg-red-400 border-2 border-red-400"
                        : "bg-white border-2 border-gray-300 hover:border-gray-400"
                    } shadow-sm hover:shadow-md`}
                  >
                    <div className="text-center">
                      <div
                        className={`font-bold text-xl ${
                          selectedDifficulty === key
                            ? "text-white"
                            : "text-gray-800"
                        }`}
                      >
                        {config.name}
                      </div>
                      <div
                        className={`text-md ${
                          selectedDifficulty === key
                            ? "text-white"
                            : "text-gray-600"
                        }`}
                      >
                        {config.pairs}쌍 ({config.cards}장)
                      </div>
                    </div>
                    <div className="flex items-center justify-center gap-1 text-orange-600 font-semibold mt-2">
                      <span className="text-lg">🪙</span>
                      <span
                        className={`${
                          selectedDifficulty === key
                            ? "text-white"
                            : "text-red-400"
                        }`}
                      >
                        {config.coin}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {/* 게임 시작 버튼 */}
              <div className="mt-6">
                <button
                  onClick={() =>
                    startGameWithDifficulty(selectedDifficulty as string)
                  }
                  className="w-[90%] mx-auto block py-4 bg-red-400 text-white rounded-full font-bold text-lg hover:bg-red-500 transition-colors shadow-lg"
                >
                  게임 시작
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 게임 완료 화면
  if (gameCompleted) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ backgroundColor: "#F5F1E8" }}
      >
        <div className="bg-white p-8 rounded-2xl shadow-2xl text-center max-w-md w-full">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-3xl font-bold text-gray-800 mb-4">완료!</h2>
          <p className="text-lg mb-6 text-gray-600">
            모든 카드를 매칭했습니다!
          </p>
          <div className="space-y-3">
            <button
              onClick={() => setShowDifficultySelect(true)}
              className="w-full px-6 py-3 bg-red-400 text-white rounded-xl hover:bg-red-500 transition-colors font-semibold"
            >
              다른 난이도 선택
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 게임 화면
  const gridCols = 4; // 모든 난이도 4열로 통일
  const maxWidth =
    gameCards.length === 8
      ? "400px"
      : gameCards.length === 16
      ? "450px"
      : "350px"; // 어려움은 더 작게
  const cardGap = gameCards.length === 24 ? "gap-1.5" : "gap-2"; // 어려움은 간격도 좁게

  return (
    <div
      className="min-h-screen p-4 relative"
      style={{ backgroundColor: "#F5F1E8" }}
    >
      <style jsx global>{`
        body {
          margin: 0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
            sans-serif;
        }
        .flip-card {
          perspective: 1000px;
        }
        .flip-card-inner {
          position: relative;
          width: 100%;
          height: 100%;
          transition: transform 0.6s;
          transform-style: preserve-3d;
        }
        .flip-card.flipped .flip-card-inner {
          transform: rotateY(180deg);
        }
        .flip-card-front,
        .flip-card-back {
          position: absolute;
          width: 100%;
          height: 100%;
          backface-visibility: hidden;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .flip-card-front {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        .flip-card-back {
          transform: rotateY(180deg);
        }
      `}</style>

      <div className="max-w-2xl mx-auto mt-6">

        {/* 미리보기 메시지 */}
        {showingCards && (
          <div className="mb-6 bg-red-400 rounded-2xl p-6 text-center shadow-lg animate-pulse">
            <div className="text-5xl font-bold text-white mb-3">
              {countdown}
            </div>
            <p className="text-xl font-bold text-white mb-1">
              잘 보고 카드를 기억하세요!
            </p>
            <p className="text-md text-white">같은 그림의 위치를 외워보세요</p>
          </div>
        )}

        {/* 카드 그리드 */}
        <div
          className={`grid ${cardGap} mx-auto`}
          style={{
            gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
            maxWidth: maxWidth,
          }}
        >
          {gameCards.map((card) => (
            <div
              key={card.id}
              className={`flip-card ${
                isCardFlipped(card.id) ? "flipped" : ""
              } cursor-pointer`}
              style={{ aspectRatio: "1 / 1.51" }}
              onClick={() => handleCardClick(card.id)}
            >
              <div className="flip-card-inner">
                {/* 앞면 (뒷면 이미지) */}
                <div className="flip-card-front">
                  <Image
                    src={gameData.backImage}
                    alt="back"
                    width={100}
                    height={100}
                  />
                </div>

                <div className="flip-card-back bg-white">
                  <Image
                    width={100}
                    height={100}
                    src={card.src}
                    alt={card.name}
                    className="w-full h-full object-cover rounded-xl"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
