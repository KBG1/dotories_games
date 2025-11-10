"use client";
import React, { useState, useEffect, useCallback } from "react";

// 게임 타입 정의
type CellType = "empty" | "dot" | "path";
type Color =
  | "red"
  | "blue"
  | "green"
  | "yellow"
  | "purple"
  | "orange"
  | "cyan"
  | "magenta"
  | "lime"
  | "brown";

interface GameCell {
  type: CellType;
  color?: Color;
}

interface PuzzleData {
  grid: GameCell[][];
  pairs: Array<{ color: Color; dots: Array<[number, number]> }>;
}

interface PuzzleConfig {
  puzzle_id: number;
  size: number;
  colors: Array<{
    color: Color;
    start_x: number;
    start_y: number;
    end_x: number;
    end_y: number;
  }>;
}

// JSON에서 퍼즐 생성
function generateFlowFreePuzzleFromConfig(config: PuzzleConfig): PuzzleData {
  const grid: GameCell[][] = Array(config.size)
    .fill(null)
    .map(() =>
      Array(config.size)
        .fill(null)
        .map(() => ({ type: "empty" as CellType }))
    );

  const pairs: Array<{ color: Color; dots: Array<[number, number]> }> = [];

  // 각 색상의 시작점과 끝점을 배치
  config.colors.forEach(({ color, start_x, start_y, end_x, end_y }) => {
    const dots: Array<[number, number]> = [
      [start_y, start_x], // 시작점 (y, x 순서)
      [end_y, end_x], // 끝점 (y, x 순서)
    ];

    pairs.push({ color, dots });

    // 점들을 그리드에 배치
    dots.forEach(([row, col]) => {
      grid[row][col] = { type: "dot", color };
    });
  });

  return { grid, pairs };
}

function FlowFreeGame2() {
  const [puzzles, setPuzzles] = useState<PuzzleConfig[]>([]);
  const [currentPuzzle, setCurrentPuzzle] = useState<PuzzleConfig | null>(null);
  const [puzzleData, setPuzzleData] = useState<PuzzleData | null>(null);
  const [gameGrid, setGameGrid] = useState<GameCell[][]>([]);
  const [loading, setLoading] = useState(true);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentColor, setCurrentColor] = useState<Color | null>(null);
  const [currentPath, setCurrentPath] = useState<Array<[number, number]>>([]);
  const [startTime] = useState<number>(Date.now());
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [completionTime, setCompletionTime] = useState<number>(0);
  // 레벨 설정
  const LEVEL_CONFIGS = [
    { level: 1, name: "Lv.1", size: "4×4", cost: 10 },
    { level: 2, name: "Lv.2", size: "5×5", cost: 15 },
    { level: 3, name: "Lv.3", size: "6×6", cost: 20 },
    { level: 4, name: "Lv.4", size: "7×7", cost: 25 },
  ];

  const [showLevelSelect, setShowLevelSelect] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState<number>(1);

  // 퍼즐 로드
  useEffect(() => {
    fetch("/color_line_game.json")
      .then((response) => response.json())
      .then((data: PuzzleConfig[]) => {
        setPuzzles(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error("퍼즐 로딩 실패:", error);
        setLoading(false);
      });
  }, []);

  // 레벨 선택 (게임 시작 안함)
  const selectLevel = (level: number) => {
    setSelectedLevel(level);
  };

  // 게임 시작
  const startGame = () => {
    const puzzle = puzzles.find((p) => p.puzzle_id === selectedLevel);
    if (!puzzle) return;

    setCurrentPuzzle(puzzle);
    const puzzleData = generateFlowFreePuzzleFromConfig(puzzle);
    setPuzzleData(puzzleData);
    setGameGrid(puzzleData.grid);
    setShowLevelSelect(false);
    setGameCompleted(false);
    setIsDrawing(false);
    setCurrentColor(null);
    setCurrentPath([]);
  };

  // 실시간 타이머
  useEffect(() => {
    if (!gameCompleted && !showLevelSelect) {
      const timer = setInterval(() => {
        setCurrentTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [startTime, gameCompleted, showLevelSelect]);

  // 터치 스크롤 방지
  useEffect(() => {
    const preventDefault = (e: Event) => {
      if (isDrawing) {
        e.preventDefault();
      }
    };

    document.addEventListener("touchmove", preventDefault, { passive: false });
    document.addEventListener("touchstart", preventDefault, { passive: false });

    return () => {
      document.removeEventListener("touchmove", preventDefault);
      document.removeEventListener("touchstart", preventDefault);
    };
  }, [isDrawing]);

  // 인접 셀 체크
  const isAdjacent = useCallback(
    ([r1, c1]: [number, number], [r2, c2]: [number, number]): boolean => {
      return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
    },
    []
  );

  // 인접 셀 가져오기
  const getAdjacentCells = useCallback(
    (row: number, col: number): Array<[number, number]> => {
      if (!currentPuzzle) return [];
      return [
        [row - 1, col],
        [row + 1, col],
        [row, col - 1],
        [row, col + 1],
      ].filter(
        ([r, c]) =>
          r >= 0 && r < currentPuzzle.size && c >= 0 && c < currentPuzzle.size
      ) as Array<[number, number]>;
    },
    [currentPuzzle]
  );

  // BFS로 실제 경로 연결 확인
  const checkPathConnectionBFS = (
    dot1: [number, number],
    dot2: [number, number],
    color: Color,
    grid: GameCell[][]
  ): boolean => {
    const [startR, startC] = dot1;
    const [endR, endC] = dot2;

    const queue: Array<[number, number]> = [[startR, startC]];
    const visited = new Set<string>();
    visited.add(`${startR},${startC}`);

    while (queue.length > 0) {
      const [r, c] = queue.shift()!;

      // 목적지 도달
      if (r === endR && c === endC) {
        return true;
      }

      // 인접한 셀 탐색
      const adjacentCells = getAdjacentCells(r, c);
      for (const [nr, nc] of adjacentCells) {
        const key = `${nr},${nc}`;
        if (visited.has(key)) continue;

        const cell = grid[nr][nc];
        // 같은 색의 경로나 점만 따라가기
        if (
          (cell.type === "path" && cell.color === color) ||
          (cell.type === "dot" && cell.color === color)
        ) {
          visited.add(key);
          queue.push([nr, nc]);
        }
      }
    }

    return false;
  };

  // 게임 완료 체크
  const checkGameCompletion = useCallback(() => {
    if (!puzzleData || !currentPuzzle) return;

    // 모든 페어가 연결되었는지 확인 (BFS 사용)
    const connectedCount = puzzleData.pairs.filter((pair) => {
      const [dot1, dot2] = pair.dots;
      return checkPathConnectionBFS(dot1, dot2, pair.color, gameGrid);
    }).length;

    // 모든 셀이 채워졌는지 확인
    const totalCells = currentPuzzle.size * currentPuzzle.size;
    const filledCells = gameGrid
      .flat()
      .filter((cell) => cell.type !== "empty").length;

    const allConnected = connectedCount === puzzleData.pairs.length;
    const allFilled = filledCells === totalCells;

    if (allConnected && allFilled) {
      setCompletionTime(currentTime);
      setGameCompleted(true);
    }
  }, [puzzleData, currentPuzzle, gameGrid, currentTime, getAdjacentCells]);

  // 이동 처리
  const handleMove = useCallback(
    (row: number, col: number) => {
      if (!isDrawing || !currentColor) return;

      const cell = gameGrid[row][col];

      // 같은 색상의 다른 점에 도달 (연결 완성)
      if (cell.type === "dot" && cell.color === currentColor) {
        const startPos = currentPath[0];
        if (startPos && (startPos[0] !== row || startPos[1] !== col)) {
          // 경로 완성
          setIsDrawing(false);
          setCurrentColor(null);
          setCurrentPath([]);
          // 완료 체크를 약간 지연시켜서 상태 업데이트 후 실행
          setTimeout(() => {
            checkGameCompletion();
          }, 100);
          return;
        }
      }

      // 다른 색상의 점이나 경로를 지나는 경우 차단
      if (
        (cell.type === "dot" && cell.color !== currentColor) ||
        (cell.type === "path" && cell.color !== currentColor)
      ) {
        return;
      }

      // 빈 칸이거나 같은 색 경로인 경우
      if (
        cell.type === "empty" ||
        (cell.type === "path" && cell.color === currentColor)
      ) {
        // 인접한 셀인지 확인
        const lastPos = currentPath[currentPath.length - 1];
        if (lastPos && isAdjacent(lastPos, [row, col])) {
          // 되돌아가기 체크
          if (currentPath.length > 1) {
            const prevPos = currentPath[currentPath.length - 2];
            if (prevPos[0] === row && prevPos[1] === col) {
              // 되돌아가기
              const newGrid = [...gameGrid];
              newGrid[lastPos[0]][lastPos[1]] = { type: "empty" };
              setGameGrid(newGrid);
              setCurrentPath((prev) => prev.slice(0, -1));
              return;
            }
          }

          // 새 경로 추가
          if (!currentPath.some(([r, c]) => r === row && c === col)) {
            const newGrid = [...gameGrid];
            newGrid[row][col] = { type: "path", color: currentColor };
            setGameGrid(newGrid);
            setCurrentPath((prev) => [...prev, [row, col]]);
          }
        }
      }
    },
    [
      isDrawing,
      currentColor,
      gameGrid,
      currentPath,
      checkGameCompletion,
      isAdjacent,
    ]
  );

  // 색상 매핑
  const getColorStyle = (color: Color): string => {
    const colorMap = {
      red: "#FF6B6B",
      blue: "#4ECDC4",
      green: "#6ead79",
      yellow: "#FFA726",
      purple: "#AB47BC",
      orange: "#FF7043",
      cyan: "#26C6DA",
      magenta: "#EC407A",
      lime: "#9CCC65",
      brown: "#8D6E63",
    };
    return colorMap[color] || "#666";
  };

  // 터치 이벤트를 위한 좌표 계산
  const getTouchCellPosition = useCallback(
    (touch: React.Touch, gridElement: HTMLElement): [number, number] | null => {
      if (!currentPuzzle) return null;
      
      const rect = gridElement.getBoundingClientRect();
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;

      // 그리드의 실제 크기에서 셀 크기 계산 (반응형)
      const gridSize = currentPuzzle.size;
      const cellSize = rect.width / gridSize;

      const col = Math.floor(x / cellSize);
      const row = Math.floor(y / cellSize);

      if (
        row >= 0 &&
        row < gridSize &&
        col >= 0 &&
        col < gridSize
      ) {
        return [row, col];
      }
      return null;
    },
    [currentPuzzle]
  );

  // 드래그 시작
  const handleStart = (row: number, col: number) => {
    const cell = gameGrid[row][col];

    if (cell.type === "dot" && cell.color) {
      // 미완성 경로 제거 + 현재 색상 경로 지우기를 한 번에 처리
      clearPathsBeforeStart(cell.color);

      setIsDrawing(true);
      setCurrentColor(cell.color);
      setCurrentPath([[row, col]]);
    }
  };

  // 새로운 선을 시작하기 전에 경로 정리 (한 번에!)
  const clearPathsBeforeStart = (startingColor: Color) => {
    if (!puzzleData) return;

    const newGrid = gameGrid.map(row => row.map(cell => ({ ...cell })));

    // 1. 모든 색상의 경로 확인하고 미완성 경로는 제거
    puzzleData.pairs.forEach((pair) => {
      const [dot1, dot2] = pair.dots;
      
      // BFS로 두 점이 실제로 연결되어 있는지 확인
      const isConnected = checkPathConnectionBFS(dot1, dot2, pair.color, newGrid);

      // 연결되지 않은 경로는 제거
      if (!isConnected) {
        for (let r = 0; r < newGrid.length; r++) {
          for (let c = 0; c < newGrid[r].length; c++) {
            if (newGrid[r][c].type === "path" && newGrid[r][c].color === pair.color) {
              newGrid[r][c] = { type: "empty" as CellType };
            }
          }
        }
      }
    });

    // 2. 시작하려는 색상의 경로도 제거 (완성된 경로라도)
    for (let r = 0; r < newGrid.length; r++) {
      for (let c = 0; c < newGrid[r].length; c++) {
        if (newGrid[r][c].type === "path" && newGrid[r][c].color === startingColor) {
          newGrid[r][c] = { type: "empty" as CellType };
        }
      }
    }

    setGameGrid(newGrid);
  };

  // 터치 무브 이벤트
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDrawing || e.touches.length === 0 || !currentColor) return;

    const touch = e.touches[0];
    const gridElement = e.currentTarget as HTMLElement;
    const position = getTouchCellPosition(touch, gridElement);

    if (position) {
      const [row, col] = position;
      handleMove(row, col);
    }
  };

  // 드래그 끝
  const handleEnd = () => {
    setIsDrawing(false);
    setCurrentColor(null);
    setCurrentPath([]);
  };

  // 레벨 선택 화면
  if (showLevelSelect) {
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
              <div className="w-20 h-20 bg-teal-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                <div className="w-8 h-8 bg-red-500 rounded-sm"></div>
              </div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">
                선 연결 게임
              </h1>
              <p className="text-gray-600 text-sm mb-1">
                같은 색깔의 점을 연결하고
              </p>
              <p className="text-gray-600 text-sm">
                모든 칸을 채우는 게임입니다!
              </p>
            </div>

            <div className="mt-6">
              <h2 className="text-lg font-bold text-gray-800 text-center mb-4">
                레벨 선택
              </h2>
              <div className="space-y-3">
                {LEVEL_CONFIGS.map((config) => (
                  <button
                    key={config.level}
                    onClick={() => selectLevel(config.level)}
                    className={`w-full p-4 rounded-2xl text-left transition-all border-2 ${
                      selectedLevel === config.level
                        ? "bg-teal-500 text-white border-teal-500 shadow-lg"
                        : "bg-white text-gray-800 border-gray-200 hover:border-gray-300 hover:shadow-md"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-lg">{config.name}</div>
                        <div
                          className={`text-sm ${
                            selectedLevel === config.level
                              ? "text-white opacity-90"
                              : "text-gray-600"
                          }`}
                        >
                          {config.size}
                        </div>
                      </div>
                      <div className="flex items-center">
                        <span
                          className={`${
                            selectedLevel === config.level
                              ? "text-yellow-300"
                              : "text-yellow-500"
                          } mr-1`}
                        >
                          🪙
                        </span>
                        <span className="font-semibold">{config.cost}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* 게임 시작 버튼 */}
              <div className="mt-6">
                <button
                  onClick={startGame}
                  className="w-[90%] mx-auto block text-white py-4 rounded-full font-bold text-lg hover:opacity-90 transition-all shadow-lg"
                  style={{ backgroundColor: "#FF6B47" }}
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
          <p className="text-lg mb-4 text-gray-600">
            모든 플로우를 연결했습니다!
          </p>
          <div className="text-xl font-semibold mb-6 text-gray-800 space-y-2">
            <p>
              완료 시간:{" "}
              <span className="text-teal-600">{completionTime}초</span>
            </p>
            <p>
              완성도: <span className="text-green-500">100%</span>
            </p>
          </div>
           <div className="space-y-3">
             <button
               onClick={() => setShowLevelSelect(true)}
               className="w-full px-6 py-3 bg-teal-500 text-white rounded-xl hover:bg-teal-600 transition-colors font-semibold"
             >
               레벨 선택
             </button>
             <button
               onClick={() => window.history.back()}
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
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">게임을 준비하고 있어요...</p>
        </div>
      </div>
    );
  }

  // 퍼즐이 로드되지 않은 경우
  if (!currentPuzzle || !puzzleData) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#F5F1E8" }}
      >
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-gray-800">플로우 프리</h1>
          <p className="text-gray-600 mb-4">퍼즐을 로드할 수 없습니다.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-teal-500 text-white rounded-xl hover:bg-teal-600 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

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
        .game-cell {
          touch-action: none;
          user-select: none;
          -webkit-user-select: none;
          -webkit-touch-callout: none;
        }
      `}</style>

      <div className="max-w-md mx-auto mt-6">
        {/* 게임 그리드 */}
        <div className="bg-white rounded-2xl p-4 shadow-lg mb-6">
          <div
            className="grid gap-1 mx-auto"
            data-game-grid
            style={{
              gridTemplateColumns: `repeat(${currentPuzzle?.size || 4}, 1fr)`,
              maxWidth: "min(100%, 400px)",
              width: "100%",
              touchAction: "none",
            }}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleEnd}
          >
            {gameGrid.map((row, rowIndex) =>
              row.map((cell, colIndex) => (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className="game-cell aspect-square border border-gray-200 cursor-pointer transition-all duration-150 rounded-lg flex items-center justify-center"
                  style={{
                    backgroundColor:
                      cell.type === "empty"
                        ? "#f8f9fa"
                        : cell.color
                        ? getColorStyle(cell.color)
                        : "#f8f9fa",
                  }}
                  onMouseDown={() => handleStart(rowIndex, colIndex)}
                  onMouseEnter={() => handleMove(rowIndex, colIndex)}
                  onMouseUp={handleEnd}
                  onDragStart={(e) => e.preventDefault()}
                  onTouchStart={() => handleStart(rowIndex, colIndex)}
                  onTouchEnd={handleEnd}
                >
                  {cell.type === "dot" && (
                    <div className="w-6 h-6 rounded-full bg-white border-2 border-gray-800 shadow-lg" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* 하단 컨트롤 */}
        <div className="text-center">
          <button
            onClick={() => {
              if (puzzleData) {
                setGameGrid(puzzleData.grid);
                setIsDrawing(false);
                setCurrentColor(null);
                setCurrentPath([]);
              }
            }}
            className="bg-white text-gray-700 px-8 py-3 rounded-xl font-semibold shadow-sm hover:shadow-md transition-shadow"
          >
            🔄 다시하기
          </button>
        </div>
      </div>
    </div>
  );
}

export default FlowFreeGame2;
