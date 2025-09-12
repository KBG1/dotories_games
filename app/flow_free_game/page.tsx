"use client";

import React, { useState, useEffect } from "react";

function GamePage() {
  return <FlowFreeGame onBack={() => window.history.back()} />;
}

// 게임 타입 정의
type CellType = "empty" | "dot" | "path";
type Color = "red" | "blue" | "green" | "yellow" | "purple" | "orange";

interface GameCell {
  type: CellType;
  color?: Color;
  connections?: {
    top?: boolean;
    right?: boolean;
    bottom?: boolean;
    left?: boolean;
  };
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
      [end_y, end_x]      // 끝점 (y, x 순서)
    ];
    
    pairs.push({ color, dots });
    
    // 점들을 그리드에 배치
    dots.forEach(([row, col]) => {
      grid[row][col] = { type: "dot", color };
    });
  });

  return { grid, pairs };
}

// Flow Free 게임 컴포넌트
function FlowFreeGame({ onBack }: { onBack: () => void }) {
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
  const [completionPercent, setCompletionPercent] = useState<number>(0);

  // 퍼즐 로드
  useEffect(() => {
    fetch('/flow_free_puzzles.json')
      .then(response => response.json())
      .then((data: PuzzleConfig[]) => {
        setPuzzles(data);
        // 랜덤 퍼즐 선택
        const randomPuzzle = data[Math.floor(Math.random() * data.length)];
        setCurrentPuzzle(randomPuzzle);
        const puzzle = generateFlowFreePuzzleFromConfig(randomPuzzle);
        setPuzzleData(puzzle);
        setGameGrid(puzzle.grid);
        setLoading(false);
      })
      .catch(error => {
        console.error('퍼즐 로딩 실패:', error);
        setLoading(false);
      });
  }, []);

  // 완성도 계산 (채워진 칸 기준) - useCallback으로 최적화
  const updateCompletionPercent = React.useCallback(() => {
    if (!currentPuzzle) return;
    const totalCells = currentPuzzle.size * currentPuzzle.size;
    const filledCells = gameGrid
      .flat()
      .filter((cell) => cell.type === "dot" || cell.type === "path").length;
    setCompletionPercent(Math.round((filledCells / totalCells) * 100));
  }, [currentPuzzle, gameGrid]);
  // 실시간 타이머
  useEffect(() => {
    if (!gameCompleted) {
      const timer = setInterval(() => {
        setCurrentTime(Math.floor((Date.now() - startTime) / 1000));
        updateCompletionPercent();
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [startTime, gameCompleted, gameGrid, updateCompletionPercent]);

  // 터치 스크롤 방지를 위한 non-passive 이벤트 리스너
  useEffect(() => {
    const preventDefault = (e: Event) => {
      if (isDrawing) {
        e.preventDefault();
      }
    };

    // 게임 영역에서만 터치 스크롤 방지
    document.addEventListener('touchmove', preventDefault, { passive: false });
    document.addEventListener('touchstart', preventDefault, { passive: false });

    return () => {
      document.removeEventListener('touchmove', preventDefault);
      document.removeEventListener('touchstart', preventDefault);
    };
  }, [isDrawing]);

  // 인접 셀 체크
  const isAdjacent = React.useCallback((
    [r1, c1]: [number, number],
    [r2, c2]: [number, number]
  ): boolean => {
    return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1;
  }, []);

  // 인접 셀 가져오기
  const getAdjacentCells = React.useCallback((
    row: number,
    col: number
  ): Array<[number, number]> => {
    if (!currentPuzzle) return [];
    return [
      [row - 1, col],
      [row + 1, col],
      [row, col - 1],
      [row, col + 1],
    ].filter(([r, c]) => r >= 0 && r < currentPuzzle.size && c >= 0 && c < currentPuzzle.size) as Array<
      [number, number]
    >;
  }, [currentPuzzle]);

  // 경로 연결 확인 (간단한 버전)
  const isPathConnected = React.useCallback((
    dot1: [number, number],
    dot2: [number, number],
    color: Color
  ): boolean => {
    const [r1, c1] = dot1;
    const [r2, c2] = dot2;

    // 각 점 주변에 같은 색 경로가 있는지 확인
    const hasPath1 = getAdjacentCells(r1, c1).some(
      ([r, c]) =>
        gameGrid[r][c].type === "path" && gameGrid[r][c].color === color
    );

    const hasPath2 = getAdjacentCells(r2, c2).some(
      ([r, c]) =>
        gameGrid[r][c].type === "path" && gameGrid[r][c].color === color
    );

    return hasPath1 && hasPath2;
  }, [gameGrid, getAdjacentCells]);

  // 게임 완료 체크
  const checkGameCompletion = React.useCallback(() => {
    if (!puzzleData || !currentPuzzle) return;
    
    console.log("게임 완료 체크 중...");

    // 모든 페어가 연결되었는지 확인
    const connectedCount = puzzleData.pairs.filter((pair) => {
      const [dot1, dot2] = pair.dots;
      const connected = isPathConnected(dot1, dot2, pair.color);
      console.log(`${pair.color} 연결 상태:`, connected);
      return connected;
    }).length;

    console.log(`연결된 페어: ${connectedCount}/${puzzleData.pairs.length}`);

    // 모든 셀이 채워졌는지 확인 (Flow Free의 핵심 규칙)
    const totalCells = currentPuzzle.size * currentPuzzle.size;
    const filledCells = gameGrid.flat().filter(cell => cell.type !== "empty").length;
    console.log(`채워진 칸: ${filledCells}/${totalCells}`);

    const allConnected = connectedCount === puzzleData.pairs.length;
    const allFilled = filledCells === totalCells;

    console.log("모든 페어 연결:", allConnected);
    console.log("모든 칸 채움:", allFilled);

    if (allConnected && allFilled) {
      console.log("🎉 게임 완료!");
      setCompletionTime(currentTime);
      setGameCompleted(true);
    }
  }, [puzzleData, currentPuzzle, gameGrid, currentTime, isPathConnected]);

  // handleMove를 useCallback으로 최적화
  const handleMove = React.useCallback((row: number, col: number) => {
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
  }, [isDrawing, currentColor, gameGrid, currentPath, checkGameCompletion, isAdjacent]);

  // 색상 매핑
  const getColorClass = (color: Color): string => {
    const colorMap = {
      red: "bg-red-500",
      blue: "bg-blue-500",
      green: "bg-green-500",
      yellow: "bg-yellow-400",
      purple: "bg-purple-500",
      orange: "bg-orange-500",
    };
    return colorMap[color];
  };

  // 터치 이벤트를 위한 좌표 계산 (개선된 버전)
  const getTouchCellPosition = React.useCallback((touch: React.Touch, gridElement: HTMLElement): [number, number] | null => {
    const rect = gridElement.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    // 패딩 제거 (24px = 6 * 4px)
    const padding = 24;
    const adjustedX = x - padding;
    const adjustedY = y - padding;

    if (adjustedX < 0 || adjustedY < 0) return null;

    // 셀 크기 계산 (72px + 4px gap) - w-18 h-18로 변경
    const cellSize = 76; // w-18 h-18 + gap-1
    const col = Math.floor(adjustedX / cellSize);
    const row = Math.floor(adjustedY / cellSize);

    if (currentPuzzle && row >= 0 && row < currentPuzzle.size && col >= 0 && col < currentPuzzle.size) {
      return [row, col];
    }
    return null;
  }, [currentPuzzle]);

  // 터치 감도 향상을 위한 추가 처리
  useEffect(() => {
    let lastTouchTime = 0;

    const handleGlobalTouchMove = (e: TouchEvent) => {
      if (!isDrawing || e.touches.length === 0) return;

      // 터치 이벤트 스로틀링 (60fps)
      const now = Date.now();
      if (now - lastTouchTime < 16) return;
      lastTouchTime = now;

      const touch = e.touches[0];
      const gameGrid = document.querySelector('[data-game-grid]') as HTMLElement;
      if (gameGrid) {
        const position = getTouchCellPosition(touch, gameGrid);
        if (position) {
          const [row, col] = position;
          handleMove(row, col);
        }
      }
    };

    if (isDrawing) {
      document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
    }

    return () => {
      document.removeEventListener('touchmove', handleGlobalTouchMove);
    };
  }, [isDrawing, getTouchCellPosition, handleMove]);

  // 드래그 시작 (마우스 + 터치)
  const handleStart = (row: number, col: number) => {
    const cell = gameGrid[row][col];

    if (cell.type === "dot" && cell.color) {
      // 기존 경로 지우기
      clearPathsForColor(cell.color);

      setIsDrawing(true);
      setCurrentColor(cell.color);
      setCurrentPath([[row, col]]);
    }
  };

  const handleMouseDown = (row: number, col: number) => {
    handleStart(row, col);
  };

  const handleTouchStart = (row: number, col: number) => {
    handleStart(row, col);
  };

  // 특정 색상의 모든 경로 지우기
  const clearPathsForColor = (color: Color) => {
    const newGrid = gameGrid.map((row) =>
      row.map((cell) => {
        if (cell.type === "path" && cell.color === color) {
          return { type: "empty" as CellType };
        }
        return cell;
      })
    );
    setGameGrid(newGrid);
  };

  // 마우스 이벤트
  const handleMouseEnter = (row: number, col: number) => {
    handleMove(row, col);
  };

  // 연속적인 경로 그리기를 위한 중간점 계산
  const fillIntermediateCells = (start: [number, number], end: [number, number]) => {
    const [startRow, startCol] = start;
    const [endRow, endCol] = end;
    const cells: Array<[number, number]> = [];
    
    // 브레젠햄 직선 알고리즘의 간단한 버전
    const dx = Math.abs(endCol - startCol);
    const dy = Math.abs(endRow - startRow);
    const sx = startCol < endCol ? 1 : -1;
    const sy = startRow < endRow ? 1 : -1;
    let err = dx - dy;
    
    let x = startCol;
    let y = startRow;
    
    while (true) {
      cells.push([y, x]);
      
      if (x === endCol && y === endRow) break;
      
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
    
    return cells;
  };

  // 터치 무브 이벤트 (개선된 버전)
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDrawing || e.touches.length === 0 || !currentColor) return;
    
    const touch = e.touches[0];
    const gridElement = e.currentTarget as HTMLElement;
    const position = getTouchCellPosition(touch, gridElement);
    
    if (position) {
      const [row, col] = position;
      const lastPos = currentPath[currentPath.length - 1];
      
      if (lastPos) {
        // 마지막 위치와 현재 위치 사이의 모든 셀들을 채움
        const intermediateCells = fillIntermediateCells(lastPos, [row, col]);
        
        for (const [r, c] of intermediateCells) {
          if (currentPuzzle && r >= 0 && r < currentPuzzle.size && c >= 0 && c < currentPuzzle.size) {
            const cell = gameGrid[r][c];
            
            // 유효한 경로인지 확인
            if (cell.type === "empty" || 
                (cell.type === "path" && cell.color === currentColor) ||
                (cell.type === "dot" && cell.color === currentColor)) {
              
              // 경로에 추가 (중복 체크)
              if (!currentPath.some(([pr, pc]) => pr === r && pc === c)) {
                handleMove(r, c);
              }
            }
          }
        }
      } else {
        handleMove(row, col);
      }
    }
  };

  // 드래그 끝 공통 로직
  const handleEnd = () => {
    setIsDrawing(false);
    setCurrentColor(null);
    setCurrentPath([]);
  };

  // 마우스 이벤트
  const handleMouseUp = () => {
    handleEnd();
  };

  // 터치 이벤트
  const handleTouchEnd = () => {
    handleEnd();
  };

  // 게임 완료 화면
  if (gameCompleted) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 p-8 rounded-lg shadow-2xl text-center border border-gray-600 max-w-md">
          <h2 className="text-3xl font-bold text-green-400 mb-4">
            🎉 Perfect!
          </h2>
          <p className="text-lg mb-4 text-gray-300">Flow를 완성했습니다!</p>
          <div className="text-xl font-semibold mb-6 text-white space-y-2">
            <p>
              완료 시간:{" "}
              <span className="text-yellow-400">{completionTime}초</span>
            </p>
            <p>
              완성도: <span className="text-green-400">100%</span>
            </p>
          </div>
          <div className="space-y-4">
            <button
              onClick={() => {
                // 새로운 랜덤 퍼즐 생성
                if (puzzles.length > 0) {
                  const randomPuzzle = puzzles[Math.floor(Math.random() * puzzles.length)];
                  setCurrentPuzzle(randomPuzzle);
                  const puzzle = generateFlowFreePuzzleFromConfig(randomPuzzle);
                  setPuzzleData(puzzle);
                  setGameGrid(puzzle.grid);
                  setGameCompleted(false);
                  setIsDrawing(false);
                  setCurrentColor(null);
                  setCurrentPath([]);
                }
              }}
              className="block w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 border border-blue-500 transition-colors"
            >
              새 퍼즐
            </button>
            <button
              onClick={onBack}
              className="block w-full px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 border border-gray-600 transition-colors"
            >
              홈으로
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 로딩 화면
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-8 text-white">🌊 Flow Free</h1>
          <p className="text-lg text-gray-300">퍼즐을 로딩 중...</p>
        </div>
      </div>
    );
  }

  // 퍼즐이 로드되지 않은 경우
  if (!currentPuzzle || !puzzleData) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-8 text-white">🌊 Flow Free</h1>
          <p className="text-lg text-gray-300 mb-4">퍼즐을 로드할 수 없습니다.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-4" style={{ 
      touchAction: "none", 
      overscrollBehavior: "none",
      userSelect: "none" 
    }}>
        <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={onBack}
            className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
          >
            ← 뒤로
          </button>
          <h1 className="text-2xl font-bold text-white">
            Flow Free {currentPuzzle?.size}x{currentPuzzle?.size}
          </h1>
          <div className="text-right">
            <div className="text-lg font-semibold text-gray-300">
              {currentTime}초
            </div>
            <div className="text-sm text-gray-400">{completionPercent}%</div>
          </div>
        </div>

        {/* 게임 설명 */}
        <div className="bg-gray-800 p-4 rounded-lg shadow mb-6 border border-gray-600">
          <p className="text-gray-300 text-center">
            같은 색깔의 점들을 연결해서 모든 칸을 채우세요! 선들이 교차하면 안
            됩니다.
          </p>
        </div>

        {/* 게임 그리드 */}
        <div className="flex justify-center">
          <div
            className="grid gap-1 bg-gray-700 p-6 rounded-lg border border-gray-600"
            data-game-grid
            style={{
              gridTemplateColumns: `repeat(${currentPuzzle?.size || 5}, 1fr)`,
              width: "fit-content",
              touchAction: "none", // 터치 스크롤 방지
            }}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp} // 그리드 밖으로 나가면 드래그 종료
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {gameGrid.map((row, rowIndex) =>
              row.map((cell, colIndex) => (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className={`
                    w-18 h-18 border border-gray-600 cursor-pointer transition-all duration-150 select-none
                    ${cell.type === "empty" ? "bg-black hover:bg-gray-800" : ""}
                    ${
                      cell.type === "dot"
                        ? `${
                            cell.color ? getColorClass(cell.color) : ""
                          } border-gray-500`
                        : ""
                    }
                    ${
                      cell.type === "path"
                        ? `${cell.color ? getColorClass(cell.color) : ""}`
                        : ""
                    }
                    ${isDrawing && currentColor ? "hover:scale-105" : ""}
                  `}
                  onMouseDown={() => handleMouseDown(rowIndex, colIndex)}
                  onMouseEnter={() => handleMouseEnter(rowIndex, colIndex)}
                  onMouseUp={handleMouseUp}
                  onDragStart={(e) => e.preventDefault()}
                  onTouchStart={() => handleTouchStart(rowIndex, colIndex)}
                  onTouchEnd={handleTouchEnd}
                >
                  {cell.type === "dot" && (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-6 h-6 rounded-full bg-white border-2 border-gray-800 shadow-lg" />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* 상태 표시 */}
        {isDrawing && currentColor && (
          <div className="text-center mt-6">
            <p className="text-lg font-semibold animate-pulse text-white">
              🎯 연결 중:
              <span
                className={`ml-2 px-3 py-1 rounded text-white ${getColorClass(
                  currentColor
                )}`}
              >
                {currentColor}
              </span>
            </p>
          </div>
        )}

        {/* 리셋 버튼 */}
        <div className="text-center mt-6 space-x-4">
          <button
            onClick={() => {
              if (puzzleData) {
                setGameGrid(puzzleData.grid);
                setIsDrawing(false);
                setCurrentColor(null);
                setCurrentPath([]);
              }
            }}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors border border-gray-500"
          >
            현재 퍼즐 리셋
          </button>
          
          <button
            onClick={() => {
              if (puzzles.length > 0) {
                const randomPuzzle = puzzles[Math.floor(Math.random() * puzzles.length)];
                setCurrentPuzzle(randomPuzzle);
                const puzzle = generateFlowFreePuzzleFromConfig(randomPuzzle);
                setPuzzleData(puzzle);
                setGameGrid(puzzle.grid);
                setIsDrawing(false);
                setCurrentColor(null);
                setCurrentPath([]);
              }
            }}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors border border-blue-500"
          >
            새 랜덤 퍼즐
          </button>
          
          <button
            onClick={() => {
              console.log("수동 완료 체크 실행");
              checkGameCompletion();
            }}
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors border border-purple-500"
          >
            완료 체크 테스트
          </button>
        </div>
      </div>
    </div>
  );
}

export default GamePage;
