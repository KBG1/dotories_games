"use client";
import React, { useState } from "react";

interface Question {
  text: string;
  answer: number;
  choices: number[];
}

type Difficulty = "easy" | "normal" | "hard";

export default function ArithmeticGame() {
  const [showDifficultySelect, setShowDifficultySelect] = useState(true);
  const [selectedDifficulty, setSelectedDifficulty] =
    useState<Difficulty | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [score, setScore] = useState(0);
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [gameCompleted, setGameCompleted] = useState(false);
  const [previousAnswer, setPreviousAnswer] = useState<number | null>(null);
  const [inCorrectCount, setInCorrectCount] = useState<number>(0);

  const MAX_QUESTIONS = 10;

  // 난이도별 설정
  const DIFFICULTY_CONFIGS = {
    easy: { name: "쉬움", description: "덧셈, 뺄셈", coin: 5 },
    normal: { name: "보통", description: "사칙연산", coin: 8 },
    hard: { name: "어려움", description: "연속 계산", coin: 12 },
  };

  // 랜덤 숫자 생성
  const randomInt = (min: number, max: number) => {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  // 약수 구하기 (나눗셈용)
  const getDivisors = (num: number): number[] => {
    const divisors: number[] = [];
    for (let i = 2; i <= Math.min(num, 9); i++) {
      if (num % i === 0) {
        divisors.push(i);
      }
    }
    return divisors.length > 0 ? divisors : [2]; // 약수가 없으면 2 반환 (기본값)
  };

  // 선택지 생성 (정답 포함 4개)
  const generateChoices = (answer: number, diff: Difficulty): number[] => {
    const choices = new Set<number>([answer]);
    const range = diff === "easy" ? 10 : 5;

    while (choices.size < 4) {
      const offset = randomInt(-range, range);
      const wrongAnswer = answer + offset;
      if (wrongAnswer !== answer && wrongAnswer > 0) {
        choices.add(wrongAnswer);
      }
    }

    return Array.from(choices).sort(() => Math.random() - 0.5);
  };

  // 문제 생성
  const generateQuestion = (
    diff: Difficulty,
    prevAns: number | null
  ): Question => {
    let text = "";
    let answer = 0;

    if (diff === "easy") {
      // 쉬움: 덧셈, 뺄셈 (1-50)
      const a = randomInt(1, 10);
      const b = randomInt(1, 10);
      const operation = Math.random() < 0.5 ? "+" : "-";

      if (operation === "+") {
        text = `${a} + ${b}`;
        answer = a + b;
      } else {
        // 음수 방지
        const larger = Math.max(a, b);
        const smaller = Math.min(a, b);
        text = `${larger} - ${smaller}`;
        answer = larger - smaller;
      }
    } else if (diff === "normal") {
      // 보통: 사칙연산 모두 (1-9)
      const operations = ["+", "-", "*", "/"];
      const operation = operations[randomInt(0, 3)];

      if (operation === "+") {
        const a = randomInt(1, 50);
        const b = randomInt(1, 50);
        text = `${a} + ${b}`;
        answer = a + b;
      } else if (operation === "-") {
        const a = randomInt(1, 50);
        const b = randomInt(1, 50);
        const larger = Math.max(a, b);
        const smaller = Math.min(a, b);
        text = `${larger} - ${smaller}`;
        answer = larger - smaller;
      } else if (operation === "*") {
        const a = randomInt(1, 9);
        const b = randomInt(1, 9);
        text = `${a} × ${b}`;
        answer = a * b;
      } else {
        // 나눗셈: 정수로 떨어지도록
        const b = randomInt(1, 9);
        const quotient = randomInt(1, 9);
        const a = b * quotient;
        text = `${a} ÷ ${b}`;
        answer = quotient;
      }
    } else {
      // 어려움: 이전 답을 활용
      if (prevAns === null) {
        // 첫 문제 또는 틀렸을 때는 간단한 곱셈/덧셈 (나눗셈 제외)
        const operations = ["+", "*"];
        const operation = operations[randomInt(0, 1)];

        if (operation === "+") {
          const a = randomInt(1, 20);
          const b = randomInt(1, 20);
          text = `${a} + ${b}`;
          answer = a + b;
        } else {
          const a = randomInt(2, 9);
          const b = randomInt(2, 9);
          text = `${a} × ${b}`;
          answer = a * b;
        }
      } else {
        // 이전 답 활용 - "[이전 답]" 형식으로 표시
        const operations = ["+", "-", "*", "/"];
        const operation = operations[randomInt(0, 3)];

        if (operation === "+") {
          const num = randomInt(1, 9);
          text = `[이전 답] + ${num}`;
          answer = prevAns + num;
        } else if (operation === "-") {
          const num = randomInt(1, 9);
          if (prevAns > num) {
            text = `[이전 답] - ${num}`;
            answer = prevAns - num;
          } else {
            text = `[이전 답] + ${num}`;
            answer = prevAns + num;
          }
        } else if (operation === "*") {
          const num = randomInt(2, 5);
          text = `[이전 답] × ${num}`;
          answer = prevAns * num;
        } else {
          // 나눗셈: 이전 답의 약수로 나누기 (항상 정수)
          const divisors = getDivisors(prevAns);
          if (divisors.length > 0) {
            const divisor = divisors[randomInt(0, divisors.length - 1)];
            text = `[이전 답] ÷ ${divisor}`;
            answer = Math.floor(prevAns / divisor); // 소수점 방지
          } else {
            // 약수가 없으면 덧셈으로 대체
            const num = randomInt(1, 9);
            text = `[이전 답] + ${num}`;
            answer = prevAns + num;
          }
        }
      }
    }

    // 모든 답이 정수임을 보장
    answer = Math.round(answer);

    const choices = generateChoices(answer, diff);
    return { text, answer, choices };
  };

  // 게임 시작
  const startGameWithDifficulty = (diff: Difficulty) => {
    setDifficulty(diff);
    setScore(0);
    setGameCompleted(false);
    setPreviousAnswer(null);
    setShowDifficultySelect(false);
    setInCorrectCount(0);

    // 첫 문제 생성
    const question = generateQuestion(diff, null);
    setCurrentQuestion(question);
    setCurrentQuestionNumber(1);
    setShowResult(false);
    setSelectedAnswer(null);
  };

  // 다음 문제
  const nextQuestion = (
    diff: Difficulty,
    prevAns: number | null,
    currentNum: number
  ) => {
    if (currentNum >= MAX_QUESTIONS) {
      setGameCompleted(true);
      return;
    }

    const question = generateQuestion(diff, prevAns);
    setCurrentQuestion(question);
    setCurrentQuestionNumber(currentNum + 1);
    setShowResult(false);
    setSelectedAnswer(null);
    setPreviousAnswer(prevAns);
  };

  // 답 선택
  const handleAnswerSelect = (answer: number) => {
    if (showResult) return;

    setSelectedAnswer(answer);
    setShowResult(true);

    const isCorrect = answer === currentQuestion?.answer;
    if (isCorrect) {
      setScore((prev) => prev + 1);

      // 다음 문제에 전달할 이전 답 (어려움 난이도일 때만)
      const nextPrevAnswer =
        difficulty === "hard" && currentQuestion
          ? currentQuestion.answer
          : previousAnswer;

      // 현재 문제 번호 저장 (setTimeout 안에서 state가 변경될 수 있으므로)
      const currentNum = currentQuestionNumber;
      const newScore = score + 1;

      // 1.5초 후 다음 문제 (정답일 때만)
      setTimeout(() => {
        if (newScore >= MAX_QUESTIONS) {
          setGameCompleted(true);
        } else {
          nextQuestion(difficulty, nextPrevAnswer, currentNum);
        }
      }, 1500);
    } else {
      // 틀렸을 때는 3초 후 새로운 문제 생성 (이전 답 초기화)
      setTimeout(() => {
        const newQuestion = generateQuestion(difficulty, null);
        setCurrentQuestion(newQuestion);
        setShowResult(false);
        setSelectedAnswer(null);
        setPreviousAnswer(null);
        setInCorrectCount((prev) => prev + 1);
      }, 1500);
    }
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
              <div className="w-20 h-20 bg-blue-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                <div className="text-white text-4xl">🧮</div>
              </div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">
                산수 게임
              </h1>
              <p className="text-gray-600 text-sm mb-1">빠르게 계산하고</p>
              <p className="text-gray-600 text-sm">정답을 맞춰보세요!</p>
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
                    onClick={() => setSelectedDifficulty(key as Difficulty)}
                    className={`w-full p-4 rounded-2xl transition-all ${
                      selectedDifficulty === key
                        ? "bg-blue-400 border-2 border-blue-400"
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
                        {config.description}
                      </div>
                      <div className="flex items-center justify-center gap-1 text-orange-600 font-semibold mt-2">
                        <span className="text-lg">🪙</span>
                        <span
                          className={`${
                            selectedDifficulty === key
                              ? "text-white"
                              : "text-blue-400"
                          }`}
                        >
                          {config.coin}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* 게임 시작 버튼 */}
              <div className="mt-6">
                <button
                  onClick={() =>
                    startGameWithDifficulty(selectedDifficulty as Difficulty)
                  }
                  disabled={!selectedDifficulty}
                  className={`w-[90%] mx-auto block py-4 rounded-full font-bold text-lg transition-colors shadow-lg ${
                    selectedDifficulty
                      ? "bg-blue-500 text-white hover:bg-blue-600"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
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
          <p className="text-lg mb-6 text-black-600">
            틀린 문제 : {inCorrectCount}개
          </p>
          <p className="text-lg mb-6 text-black-600">
            정답률 :{" "}
            <span className="text-green-600 font-bold">
              {Math.round((score / (MAX_QUESTIONS + inCorrectCount)) * 100)}%
            </span>
          </p>
          <div className="space-y-3">
            <button
              onClick={() => setShowDifficultySelect(true)}
              className="w-full px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors font-semibold"
            >
              다른 난이도 선택
            </button>
            <button
              onClick={() => startGameWithDifficulty(difficulty)}
              className="w-full px-6 py-3 bg-gray-500 text-white rounded-xl hover:bg-gray-600 transition-colors font-semibold"
            >
              같은 난이도 다시하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 게임 화면
  return (
    <div className="min-h-screen p-4" style={{ backgroundColor: "#F5F1E8" }}>
      <div className="max-w-md mx-auto">
        {/* 진행 상황 */}
        <div className="mb-6 bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex justify-between items-center">
            <span className="text-gray-600 font-semibold">정답</span>
            <span className="text-blue-600 font-bold text-lg">
              {score} / {MAX_QUESTIONS}
            </span>
          </div>
          <div className="mt-2 bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${(score / MAX_QUESTIONS) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* 문제 */}
        {currentQuestion && (
          <div className="bg-white rounded-2xl p-8 shadow-lg mb-6">
            <div className="text-center mb-8">
              <div className="text-4xl font-bold text-gray-800 mb-4">
                {currentQuestion.text} = ?
              </div>
            </div>

            {/* 선택지 */}
            <div className="grid grid-cols-2 gap-3">
              {currentQuestion.choices.map((choice, index) => {
                const isSelected = selectedAnswer === choice;
                const isCorrect = choice === currentQuestion.answer;
                const showCorrectAnswer = showResult && isCorrect;
                const showWrongAnswer = showResult && isSelected && !isCorrect;

                return (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(choice)}
                    disabled={showResult}
                    className={`p-6 rounded-xl text-2xl font-bold transition-all ${
                      showCorrectAnswer
                        ? "bg-green-500 text-white"
                        : showWrongAnswer
                        ? "bg-red-500 text-white"
                        : "bg-gray-100 text-gray-800 hover:bg-gray-200 active:scale-95"
                    } ${showResult ? "cursor-default" : "cursor-pointer"}`}
                  >
                    {choice}
                    {showCorrectAnswer && " ✓"}
                    {showWrongAnswer && " ✗"}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-12"></div>
      </div>
    </div>
  );
}
