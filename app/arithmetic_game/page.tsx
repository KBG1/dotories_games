'use client'
import React, { useState, useEffect } from 'react'

interface MathQuestion {
  question_id: number
  operand: number[]
  operator: string[]
  answer: number
}

export default function ArithmeticGame() {
  const [questions, setQuestions] = useState<MathQuestion[]>([])
  const [currentQuestion, setCurrentQuestion] = useState<MathQuestion | null>(null)
  const [userAnswer, setUserAnswer] = useState('')
  const [score, setScore] = useState(0)
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState(0)
  const [gameStarted, setGameStarted] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [gameFinished, setGameFinished] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [endTime, setEndTime] = useState<number | null>(null)
  const [usedQuestions, setUsedQuestions] = useState<Set<number>>(new Set())
  
  const MAX_QUESTIONS = 10 // 총 문제 개수

  // JSON 파일에서 문제 로드
  useEffect(() => {
    fetch('/math_questions.json')
      .then(response => response.json())
      .then((data: MathQuestion[]) => {
        setQuestions(data)
      })
      .catch(error => console.error('문제 로딩 실패:', error))
  }, [])

  // 게임 시작
  const startGame = () => {
    if (questions.length === 0) return
    setGameStarted(true)
    setGameFinished(false)
    setShowModal(false)
    setScore(0)
    setCurrentQuestionNumber(0)
    setUsedQuestions(new Set())
    setStartTime(Date.now())
    getRandomQuestion()
  }

  // 랜덤 문제 선택 (중복 방지)
  const getRandomQuestion = () => {
    if (questions.length === 0) return
    
    // 사용되지 않은 문제들만 필터링
    const availableQuestions = questions.filter(q => !usedQuestions.has(q.question_id))
    
    // 모든 문제를 다 사용했으면 다시 시작
    if (availableQuestions.length === 0) {
      setUsedQuestions(new Set())
      const randomIndex = Math.floor(Math.random() * questions.length)
      const selectedQuestion = questions[randomIndex]
      setCurrentQuestion(selectedQuestion)
      setUsedQuestions(prev => new Set(prev).add(selectedQuestion.question_id))
    } else {
      const randomIndex = Math.floor(Math.random() * availableQuestions.length)
      const selectedQuestion = availableQuestions[randomIndex]
      setCurrentQuestion(selectedQuestion)
      setUsedQuestions(prev => new Set(prev).add(selectedQuestion.question_id))
    }
    
    setUserAnswer('')
    setShowResult(false)
    setIsCorrect(null)
    setCurrentQuestionNumber(prev => prev + 1)
  }

  // 문제를 문자열로 표시
  const formatQuestion = (question: MathQuestion): string => {
    let result = question.operand[0].toString()
    for (let i = 0; i < question.operator.length; i++) {
      result += ` ${question.operator[i]} ${question.operand[i + 1]}`
    }
    return result
  }

  // 답 제출
  const submitAnswer = () => {
    if (!currentQuestion || userAnswer === '') return

    const userNum = parseFloat(userAnswer)
    const correct = Math.abs(userNum - currentQuestion.answer) < 0.01 // 소수점 오차 고려

    setIsCorrect(correct)
    setShowResult(true)

    if (correct) {
      setScore(prev => prev + 1)
    }

    // 2초 후 다음 문제 또는 게임 종료
    setTimeout(() => {
      if (currentQuestionNumber >= MAX_QUESTIONS) {
        setEndTime(Date.now())
        setGameFinished(true)
        setShowModal(true)
      } else {
        getRandomQuestion()
      }
    }, 2000)
  }

  // 키패드 입력
  const handleKeypadClick = (value: string) => {
    if (value === 'clear') {
      setUserAnswer('')
    } else if (value === 'delete') {
      setUserAnswer(prev => prev.slice(0, -1))
    } else if (value === 'submit') {
      submitAnswer()
    } else {
      setUserAnswer(prev => prev + value)
    }
  }

  // 엔터키로 제출
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      submitAnswer()
    }
  }

  // 걸린 시간 계산
  const getElapsedTime = () => {
    if (!startTime || !endTime) return 0
    return Math.floor((endTime - startTime) / 1000)
  }

  // 시간을 분:초 형식으로 변환
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen flex flex-col relative bg-slate-50">

      {/* 헤더 */}
      <div className="fixed top-0 left-0 right-0 h-15 bg-white border-b border-slate-200 flex items-center justify-between px-5 z-50 shadow-lg">
        <div 
          className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center cursor-pointer text-lg text-slate-700 transition-all duration-200 hover:bg-slate-200"
          onClick={() => window.history.back()}
        >
          ←
        </div>
        <div className="font-semibold text-slate-800">
          {gameStarted ? `${currentQuestionNumber}/${MAX_QUESTIONS}` : '산수게임'}
        </div>
        <div></div>
      </div>

      <div className="flex-1 pt-20 pb-5 flex flex-col max-w-lg mx-auto w-full px-5">
        {!gameStarted ? (
          // 시작 화면
          <div className="flex-1 flex flex-col justify-center items-center px-5 text-center">
            <h1 className="text-4xl mb-4 text-slate-800">🧮 산수게임</h1>
            <p className="text-lg text-slate-600 mb-10 leading-relaxed">
              기초 사칙연산을 연습해보세요!<br/>{MAX_QUESTIONS}문제가 나오면 정답을 입력하고<br/>제출 버튼을 눌러주세요.
            </p>
            <button 
              className="bg-blue-500 text-white border-none py-4 px-8 rounded-xl text-lg font-semibold cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-blue-500/30"
              onClick={startGame}
            >
              🎯 게임 시작
            </button>
          </div>
        ) : gameFinished ? (
          // 게임 종료 화면
          <div className="flex-1 flex flex-col justify-center items-center px-5 text-center">
            <h1 className="text-4xl mb-4 text-slate-800">🎉 게임 완료!</h1>
            <p className="text-lg text-slate-600 mb-4 leading-relaxed">
              총 {MAX_QUESTIONS}문제 중<br/><strong className="text-blue-600">{score}문제</strong>를 맞혔습니다!
            </p>
            <p className="text-lg text-slate-600 mb-10">
              정답률: <strong className="text-green-600">{Math.round((score / MAX_QUESTIONS) * 100)}%</strong>
            </p>
            <button 
              className="bg-blue-500 text-white border-none py-4 px-8 rounded-xl text-lg font-semibold cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-blue-500/30"
              onClick={startGame}
            >
              🔄 다시 도전
            </button>
          </div>
        ) : (
          // 게임 화면
          <>
            {currentQuestion && (
              <div className="bg-white mx-5 py-10 px-5 rounded-2xl shadow-xl text-center border border-slate-200">
                <div className="text-4xl sm:text-3xl font-semibold text-slate-800 mb-5 tracking-wider">
                  {formatQuestion(currentQuestion)} = ?
                </div>
                
                <input
                  type="number"
                  className="w-full max-w-xs h-15 text-3xl sm:text-2xl text-center border-2 border-slate-200 rounded-xl bg-slate-50 text-slate-800 font-semibold outline-none transition-all duration-200 focus:border-blue-500 focus:bg-white"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="답을 입력하세요"
                  disabled={showResult}
                />

                {showResult && (
                  <div className={`mt-5 p-4 rounded-xl font-semibold text-lg ${
                    isCorrect 
                      ? 'bg-green-50 text-green-600 border border-green-200' 
                      : 'bg-red-50 text-red-600 border border-red-200'
                  }`}>
                    {isCorrect ? (
                      '🎉 정답입니다!'
                    ) : (
                      `❌ 틀렸습니다. 정답: ${currentQuestion.answer}`
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 키패드 */}
            <div className="p-5 bg-white border-t border-slate-200">
              <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                  <button
                    key={num}
                    className="h-15 sm:h-12 border border-slate-200 rounded-xl bg-slate-50 text-2xl sm:text-xl font-semibold text-slate-700 cursor-pointer transition-all duration-200 flex items-center justify-center touch-manipulation hover:bg-slate-100 active:scale-95"
                    onClick={() => handleKeypadClick(num.toString())}
                    disabled={showResult}
                  >
                    {num}
                  </button>
                ))}
                <button
                  className="h-15 sm:h-12 border border-blue-500 rounded-xl bg-blue-500 text-white text-2xl sm:text-xl font-semibold cursor-pointer transition-all duration-200 flex items-center justify-center touch-manipulation hover:opacity-90 active:scale-95"
                  onClick={() => handleKeypadClick('clear')}
                  disabled={showResult}
                >
                  C
                </button>
                <button
                  className="h-15 sm:h-12 border border-slate-200 rounded-xl bg-slate-50 text-2xl sm:text-xl font-semibold text-slate-700 cursor-pointer transition-all duration-200 flex items-center justify-center touch-manipulation hover:bg-slate-100 active:scale-95"
                  onClick={() => handleKeypadClick('0')}
                  disabled={showResult}
                >
                  0
                </button>
                <button
                  className="h-15 sm:h-12 border border-red-500 rounded-xl bg-red-500 text-white text-2xl sm:text-xl font-semibold cursor-pointer transition-all duration-200 flex items-center justify-center touch-manipulation hover:opacity-90 active:scale-95"
                  onClick={() => handleKeypadClick('delete')}
                  disabled={showResult}
                >
                  ⌫
                </button>
                <button
                  className="h-15 sm:h-12 border border-slate-200 rounded-xl bg-slate-50 text-2xl sm:text-xl font-semibold text-slate-700 cursor-pointer transition-all duration-200 flex items-center justify-center touch-manipulation hover:bg-slate-100 active:scale-95"
                  onClick={() => handleKeypadClick('.')}
                  disabled={showResult}
                >
                  .
                </button>
                <button
                  className="h-15 sm:h-12 border border-blue-500 rounded-xl bg-blue-500 text-white text-2xl sm:text-xl font-semibold cursor-pointer transition-all duration-200 flex items-center justify-center touch-manipulation hover:opacity-90 active:scale-95 col-span-2"
                  onClick={() => handleKeypadClick('submit')}
                  disabled={showResult || userAnswer === ''}
                >
                  제출
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 결과 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-5">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-2xl">
            <h2 className="text-3xl font-bold text-slate-800 mb-6">🎉 게임 완료!</h2>
            <div className="space-y-4 mb-8">
              <div className="text-lg text-slate-600">
                <span className="font-semibold">정답률:</span> 
                <span className="text-green-600 font-bold ml-2">{Math.round((score / MAX_QUESTIONS) * 100)}%</span>
              </div>
              <div className="text-lg text-slate-600">
                <span className="font-semibold">걸린 시간:</span> 
                <span className="text-blue-600 font-bold ml-2">{formatTime(getElapsedTime())}</span>
              </div>
              <div className="text-lg text-slate-600">
                <span className="font-semibold">맞힌 문제:</span> 
                <span className="text-purple-600 font-bold ml-2">{score}/{MAX_QUESTIONS}</span>
              </div>
            </div>
            <button 
              className="w-full bg-blue-500 text-white py-4 px-6 rounded-xl text-lg font-semibold cursor-pointer transition-all duration-200 hover:bg-blue-600 active:scale-95"
              onClick={() => setShowModal(false)}
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
