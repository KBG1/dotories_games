"use client";
import { useState } from "react";
import data from "@/public/flip_card_game.json";

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

  // 난이도별 설정
  const DIFFICULTY_CONFIGS = {
    easy: { name: "쉬움", pairs: 4, cards: 8, coin: 5 },
    normal: { name: "보통", pairs: 8, cards: 16, coin: 8 },
    hard: { name: "어려움", pairs: 12, cards: 24, coin: 12 }
  };

  // 게임 시작
  const startGameWithDifficulty = (difficulty: string) => {
    const pairCount =
      gameData.difficulty[difficulty as keyof typeof gameData.difficulty];
    const gameCards = gameData.cards.slice(0, pairCount * 2);
    console.log("게임 시작:", difficulty, gameCards);
    setShowDifficultySelect(false);
    // 여기에 게임 로직 추가 예정
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
                  onClick={() => startGameWithDifficulty(selectedDifficulty as string)}
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

  return <div>게임 화면 (구현 예정)</div>;
}
