"use client";
import React, { useState, useEffect } from "react";

// 게임 타입 정의
interface Word {
  id: number;
  word: string;
  direction: "horizontal" | "vertical";
  start_row: number;
  start_col: number;
}

interface Puzzle {
  puzzle_id: number;
  difficulty: "easy" | "medium" | "hard";
  size: number;
  words: Word[];
  grid: string[][];
  solution: string[][];
  solo_words: string[];
}

function CrosswordPuzzles() {
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [currentPuzzle, setCurrentPuzzle] = useState<Puzzle | null>(null);
  const [userGrid, setUserGrid] = useState<string[][]>([]);
  const [loading, setLoading] = useState(true);
  const [showDifficultySelect, setShowDifficultySelect] = useState(true);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{
    row: number;
    col: number;
  } | null>(null);
  const [availableLetters, setAvailableLetters] = useState<string[]>([]);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string | null>(
    null
  );
  const [usedLetters, setUsedLetters] = useState<Set<number>>(new Set());
  const [cellToLetterIndex, setCellToLetterIndex] = useState<Map<string, number>>(new Map());

  // 난이도별 설정
  const DIFFICULTY_CONFIGS = {
    easy: { name: "쉬움", size: "5×5", coins: 5 },
    medium: { name: "보통", size: "6×6", coins: 8 },
    hard: { name: "어려움", size: "7×7", coins: 12 },
  };

  // 퍼즐 로드
  useEffect(() => {
    fetch("/crossword_puzzles.json")
      .then((response) => response.json())
      .then((data: Puzzle[]) => {
        setPuzzles(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("퍼즐 로딩 실패:", error);
        setLoading(false);
      });
  }, []);


  // 난이도 선택 및 랜덤 퍼즐 시작
  const startGameWithDifficulty = (difficulty: string) => {
    const difficultyPuzzles = puzzles.filter(
      (p) => p.difficulty === difficulty
    );
    if (difficultyPuzzles.length === 0) return;

    // 랜덤하게 퍼즐 선택
    const randomPuzzle =
      difficultyPuzzles[Math.floor(Math.random() * difficultyPuzzles.length)];

    setCurrentPuzzle(randomPuzzle);
    initializeUserGrid(randomPuzzle);
    setShowDifficultySelect(false);
    setGameCompleted(false);
    setSelectedCell(null);
    setUsedLetters(new Set());
    setCellToLetterIndex(new Map());
  };

  // 사용자 그리드 초기화
  const initializeUserGrid = (puzzle: Puzzle) => {
    const newGrid = puzzle.grid.map((row) =>
      row.map((cell) => {
        if (cell === "" || cell === "?") {
          return ""; // 빈칸으로 설정 (? 도 빈칸으로 처리)
        }
        return cell; // 이미 채워진 글자는 그대로
      })
    );
    setUserGrid(newGrid);
    generateAvailableLetters(puzzle);
  };

  // 사용 가능한 글자 후보군 생성
  const generateAvailableLetters = (puzzle: Puzzle) => {
    // solo_words가 있으면 그것을 사용, 없으면 기존 방식
    if (puzzle.solo_words && puzzle.solo_words.length > 0) {
      // solo_words를 섞어서 12개 선택
      const shuffled = [...puzzle.solo_words].sort(() => Math.random() - 0.5);
      setAvailableLetters(shuffled.slice(0, 12));
    } else {
      // 기존 방식 (fallback)
      const allLetters = new Set<string>();

      // 모든 단어에서 글자 추출
      puzzle.words.forEach((word) => {
        for (const letter of word.word) {
          allLetters.add(letter);
        }
      });

      // 배열로 변환하고 섞기
      const lettersArray = Array.from(allLetters);
      const shuffled = lettersArray.sort(() => Math.random() - 0.5);

      // 12개 글자로 제한 (2줄 × 6개)
      setAvailableLetters(shuffled.slice(0, 12));
    }
  };

  // 셀 클릭 핸들러
  const handleCellClick = (row: number, col: number) => {
    if (!currentPuzzle) return;

    const originalCell = currentPuzzle.grid[row][col];
    // X가 아닌 모든 칸 선택 가능 (빈칸이거나 이미 채워진 글자)
    if (originalCell !== "X") {
      setSelectedCell({ row, col });
    }
  };

  // 글자 선택 핸들러
  const handleLetterSelect = (letter: string, letterIndex: number) => {
    if (!selectedCell || !currentPuzzle) return;

    const { row, col } = selectedCell;
    const originalCell = currentPuzzle.grid[row][col];

    // 빈 칸에만 글자 입력 가능
    if (originalCell === "" || originalCell === "?") {
      const cellKey = `${row}-${col}`;
      
      // 이미 해당 칸에 글자가 있다면 이전 글자를 복구
      const existingLetter = userGrid[row][col];
      if (existingLetter) {
        const previousLetterIndex = cellToLetterIndex.get(cellKey);
        if (previousLetterIndex !== undefined) {
          setUsedLetters(prev => {
            const newSet = new Set(prev);
            newSet.delete(previousLetterIndex);
            return newSet;
          });
        }
      }

      const newGrid = [...userGrid];
      newGrid[row][col] = letter;
      setUserGrid(newGrid);

      // 새로운 글자 사용 처리
      setUsedLetters(prev => new Set([...prev, letterIndex]));
      setCellToLetterIndex(prev => new Map(prev).set(cellKey, letterIndex));

      checkCompletion(newGrid);
    }
  };

  // 글자 삭제 핸들러
  const handleLetterDelete = () => {
    if (!selectedCell || !currentPuzzle) return;

    const { row, col } = selectedCell;
    const originalCell = currentPuzzle.grid[row][col];

    // 빈 칸에서만 삭제 가능
    if (originalCell === "" || originalCell === "?") {
      const cellKey = `${row}-${col}`;
      const letterIndex = cellToLetterIndex.get(cellKey);
      
      if (letterIndex !== undefined) {
        // 삭제된 글자를 다시 사용 가능하게 만들기
        setUsedLetters(prev => {
          const newSet = new Set(prev);
          newSet.delete(letterIndex);
          return newSet;
        });
        
        // 셀-글자 매핑 제거
        setCellToLetterIndex(prev => {
          const newMap = new Map(prev);
          newMap.delete(cellKey);
          return newMap;
        });
      }

      const newGrid = [...userGrid];
      newGrid[row][col] = "";
      setUserGrid(newGrid);
    }
  };
  // 정답 확인 함수
  const isCorrectAnswer = (row: number, col: number, letter: string) => {
    if (!currentPuzzle || !currentPuzzle.solution) return false;
    return currentPuzzle.solution[row][col] === letter;
  };

  // 게임 완료 체크
  const checkCompletion = (grid: string[][]) => {
    if (!currentPuzzle || !currentPuzzle.solution) return;

    // solution과 현재 그리드 비교
    const isComplete = currentPuzzle.solution.every((row, rowIndex) =>
      row.every((cell, colIndex) => {
        if (cell === "") return true; // 빈칸은 무시
        return grid[rowIndex][colIndex] === cell;
      })
    );

    if (isComplete) {
      setGameCompleted(true);
    }
  };
  
  const handleReset = () => {
    if (currentPuzzle) {
      initializeUserGrid(currentPuzzle);
      setSelectedCell(null);
      setUsedLetters(new Set());
      setCellToLetterIndex(new Map());
    }
  }
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
              <div className="w-20 h-20 bg-purple-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                <div className="text-white text-2xl font-bold">가</div>
              </div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">
                가로세로 퍼즐
              </h1>
              <p className="text-gray-600 text-sm mb-1">빈칸을 채워서</p>
              <p className="text-gray-600 text-sm">단어를 완성해보세요!</p>
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
                        ? "bg-purple-500 border-2 border-purple-500"
                        : "bg-white border-2 border-gray-300 hover:border-gray-400"
                    } shadow-sm hover:shadow-md`}
                  >
                    <div className="text-center">
                      <div
                        className={`font-bold text-xl text-gray-800 ${
                          selectedDifficulty === key ? "text-white" : ""
                        }`}
                      >
                        {config.name}
                      </div>
                      <div
                        className={`text-md text-gray-600 ${
                          selectedDifficulty === key ? "text-white" : ""
                        }`}
                      >
                        {config.size} 크기
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
                          {config.coins}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* 게임 시작 버튼 */}
              {selectedDifficulty && (
                <div className="mt-6">
                  <button
                    onClick={() => startGameWithDifficulty(selectedDifficulty)}
                    className="w-[90%] mx-auto block py-4 bg-purple-500 text-white rounded-full font-bold text-lg hover:bg-purple-600 transition-colors shadow-lg"
                  >
                    게임 시작
                  </button>
                </div>
              )}
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
            모든 단어를 완성했습니다!
          </p>
          <div className="space-y-3">
            <button
              onClick={() => setShowDifficultySelect(true)}
              className="w-full px-6 py-3 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-colors font-semibold"
            >
              다른 난이도 선택
            </button>
            <button
              onClick={() => (window.location.href = "/crossword_puzzles")}
              className="w-full px-6 py-3 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-colors font-semibold"
            >
              메인화면으로
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 로딩 화면
  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#F5F1E8" }}
      >
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">퍼즐을 준비하고 있어요...</p>
        </div>
      </div>
    );
  }

  // 게임 화면
  return (
    <div
      className="min-h-screen p-4"
      style={{
        backgroundColor: "#F5F1E8",
        touchAction: "none",
        overscrollBehavior: "none",
        userSelect: "none",
      }}
    >
      <style jsx global>{`
        body {
          margin: 0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
            sans-serif;
          touch-action: manipulation;
          overscroll-behavior: none;
        }
        .crossword-cell {
          touch-action: none;
          user-select: none;
          -webkit-user-select: none;
          -webkit-touch-callout: none;
        }
      `}</style>

      <div className="max-w-md mx-auto">
        {/* 상단 HUD */}
        <div className="flex items-center justify-between mb-6 pt-4">
          <button
            onClick={() => setShowDifficultySelect(true)}
            className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg"
          >
            ←
          </button>

          <div className="bg-white rounded-full px-4 py-2 shadow-sm">
            <span className="text-sm font-semibold text-gray-600">
              퍼즐 난이도 - {currentPuzzle?.difficulty === "easy" ? "쉬움" : currentPuzzle?.difficulty === "medium" ? "보통" : "어려움"}
            </span>
          </div>
        </div>

        {/* 게임 그리드 */}
        <div className="bg-white rounded-2xl p-4 shadow-lg mb-6">
          <div
            className="grid gap-1 mx-auto"
            style={{
              gridTemplateColumns: `repeat(${currentPuzzle?.size || 5}, 1fr)`,
              width: "fit-content",
            }}
          >
            {currentPuzzle?.grid.map((row, rowIndex) =>
              row.map((cell, colIndex) => {
                const userCell = userGrid[rowIndex]?.[colIndex] || "";
                const isSelected =
                  selectedCell?.row === rowIndex &&
                  selectedCell?.col === colIndex;
                const isBlank = cell === "" || cell === "?";
                const isBlockedCell = cell === "X";
                const isFixed = !isBlank && !isBlockedCell;
                const isCorrect = userCell && isBlank && isCorrectAnswer(rowIndex, colIndex, userCell);

                return (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className={`crossword-cell w-12 h-12 border-2 transition-all duration-150 rounded-lg flex items-center justify-center font-bold text-lg ${
                      isBlockedCell
                        ? "border-gray-600 bg-gray-600 cursor-default"
                        : isCorrect
                        ? "border-green-500 bg-green-100 cursor-pointer"
                        : isBlank
                        ? isSelected
                          ? "border-purple-500 bg-purple-100 cursor-pointer"
                          : "border-gray-300 bg-white hover:border-gray-400 cursor-pointer"
                        : isSelected
                        ? "border-purple-500 bg-purple-50 cursor-pointer"
                        : "border-gray-400 bg-gray-100 hover:border-purple-300 cursor-pointer"
                    }`}
                    onClick={() => handleCellClick(rowIndex, colIndex)}
                  >
                    {isBlockedCell ? (
                      ""
                    ) : isFixed ? (
                      <span className="text-gray-700">{cell}</span>
                    ) : (
                      <span
                        className={`${
                          userCell
                            ? isCorrectAnswer(rowIndex, colIndex, userCell)
                              ? "text-green-600 font-bold"
                              : "text-purple-600"
                            : "text-gray-400"
                        }`}
                      >
                        {userCell}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 글자 선택 패널 */}
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-6">
          {/* 글자 후보군 */}
          <div className="grid grid-cols-6 gap-2 mb-4">
            {availableLetters.map((letter, index) => {
              const isUsed = usedLetters.has(index);
              const canSelect =
                selectedCell &&
                (currentPuzzle?.grid[selectedCell.row][selectedCell.col] ===
                  "" ||
                  currentPuzzle?.grid[selectedCell.row][selectedCell.col] ===
                    "?");

              return (
                <div key={index} className="aspect-square">
                  <button
                    onClick={() => handleLetterSelect(letter, index)}
                    disabled={!canSelect || isUsed}
                    className={`w-full h-full rounded-lg font-bold text-lg transition-all duration-300 ease-in-out transform ${
                      isUsed
                        ? "scale-0 opacity-0 pointer-events-none"
                        : canSelect
                        ? "scale-100 opacity-100 bg-purple-100 text-purple-700 hover:bg-purple-200 hover:scale-105 active:scale-95"
                        : "scale-100 opacity-100 bg-gray-100 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    {letter}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* 삭제 버튼 */}
        <button
          onClick={handleLetterDelete}
          disabled={
            !selectedCell ||
            (selectedCell &&
              currentPuzzle?.grid[selectedCell.row][selectedCell.col] !== "" &&
              currentPuzzle?.grid[selectedCell.row][selectedCell.col] !== "?")
          }
          className={`w-full py-3 rounded-xl font-semibold transition-colors ${
            selectedCell &&
            (currentPuzzle?.grid[selectedCell.row][selectedCell.col] === "" ||
              currentPuzzle?.grid[selectedCell.row][selectedCell.col] === "?")
              ? "bg-red-400 text-white hover:bg-red-200"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          🗑️ 지우기
        </button>
        <button
          onClick={handleReset}
          className="w-full mt-3 py-3 rounded-xl font-semibold transition-colors bg-blue-400 text-white hover:bg-blue-500"
        >
          🔄 전체 초기화
        </button>
      </div>

      <div className="mt-24"></div>
    </div>
  );
}

export default CrosswordPuzzles;
