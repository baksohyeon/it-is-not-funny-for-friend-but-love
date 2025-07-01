"use client"

import { useState, useEffect, useRef } from "react"
import { incrementVisitorCount, getVisitorCount } from "@/actions/visitor-actions"
import { getUserSessionData, updateUserSessionData, incrementHeartCount } from "@/actions/session-actions"
import { getOrCreateSessionId, saveLocalHeartData, getLocalHeartData, syncSessionData } from "@/lib/session-utils"
import { supabase } from "@/lib/supabase"
import {
  trackHeartClick,
  trackMilestone,
  trackPopup,
  trackSpecialEffect,
  trackMusicToggle,
  trackSessionData,
  trackVisitorCount,
} from "@/lib/analytics"

interface PopupWindow {
  id: number
  type: "congratulations" | "visitor" | "music" | "ad" | "milestone" | "special" | "rainbow" | "fireworks"
  x: number
  y: number
  isVisible: boolean
  data?: any
}

interface MouseTrail {
  id: number
  x: number
  y: number
}

interface FloatingHeart {
  id: number
  x: number
  y: number
  size: number
  color: string
  speed: number
}

interface Confetti {
  id: number
  x: number
  y: number
  color: string
  rotation: number
  speed: number
}

export default function RetroMailClient() {
  const [sessionStartTime] = useState(Date.now())
  const [currentDate, setCurrentDate] = useState(new Date())
  const [heartCount, setHeartCount] = useState(0)
  const [isMaximized, setIsMaximized] = useState(true)
  const [encouragementIndex, setEncouragementIndex] = useState(0)
  const [visitorCount, setVisitorCount] = useState(0)
  const [isLoadingVisitors, setIsLoadingVisitors] = useState(true)
  const [isLoadingSession, setIsLoadingSession] = useState(true)
  const [sessionId, setSessionId] = useState("")
  const [popups, setPopups] = useState<PopupWindow[]>([])
  const [mouseTrail, setMouseTrail] = useState<MouseTrail[]>([])
  const [floatingHearts, setFloatingHearts] = useState<FloatingHeart[]>([])
  const [confetti, setConfetti] = useState<Confetti[]>([])
  const [isMusicPlaying, setIsMusicPlaying] = useState(false)
  const [showScrollText, setShowScrollText] = useState(true)
  const [blinkingText, setBlinkingText] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [showLoading, setShowLoading] = useState(false)
  const [backgroundEffect, setBackgroundEffect] = useState<"none" | "rainbow" | "stars" | "hearts" | "fireworks">(
    "none",
  )
  const [screenShake, setScreenShake] = useState(false)
  const [heartLevel, setHeartLevel] = useState(1)
  const mouseTrailRef = useRef<number>(0)
  const floatingHeartsRef = useRef<number>(0)
  const confettiRef = useRef<number>(0)
  const [activePopupTypes, setActivePopupTypes] = useState<Set<string>>(new Set())
  const [triggeredMilestones, setTriggeredMilestones] = useState<Set<number>>(new Set())

  const encouragementMessages = [
    "정말 잘하고 있어요! 💪",
    "당신은 최고예요! ⭐",
    "힘내세요! 거의 다 왔어요! 🚀",
    "오늘도 수고했어요! 🌟",
    "당신을 응원해요! 💖",
    "파이팅! 할 수 있어요! 🔥",
    "놀라워요! 계속해요! 🎯",
    "대단한 에너지네요! ⚡",
    "응원의 달인이에요! 🏆",
    "전설적인 응원왕! 👑",
  ]

  const scrollMessages = [
    "🌟 당신을 응원합니다! 🌟",
    "💪 화이팅! 할 수 있어요! 💪",
    "✨ 오늘도 수고하셨어요! ✨",
    "🎉 당신은 최고입니다! 🎉",
    "🚀 응원 에너지 충전중! 🚀",
    "⭐ 별처럼 빛나세요! ⭐",
    "🔥 열정이 느껴져요! 🔥",
    "👑 응원의 왕이세요! 👑",
  ]

  // 하트 레벨 계산
  const calculateHeartLevel = (hearts: number) => {
    if (hearts >= 100) return 10
    if (hearts >= 75) return 9
    if (hearts >= 50) return 8
    if (hearts >= 30) return 7
    if (hearts >= 20) return 6
    if (hearts >= 15) return 5
    if (hearts >= 10) return 4
    if (hearts >= 7) return 3
    if (hearts >= 5) return 2
    return 1
  }

  // 특별 이벤트 트리거
  const triggerSpecialEvent = (hearts: number) => {
    const level = calculateHeartLevel(hearts)
    setHeartLevel(level)

    // 마일스톤 이벤트 - 각 하트 수마다 한 번만 실행
    if (hearts === 5 && !triggeredMilestones.has(5)) {
      setTriggeredMilestones((prev) => new Set([...prev, 5]))
      createPopup("milestone", { title: "첫 번째 마일스톤!", message: "5개 달성! 응원 에너지가 느껴져요!", icon: "🎯" })
      setBackgroundEffect("hearts")
      setTimeout(() => setBackgroundEffect("none"), 5000)
      trackMilestone(5, level)
      trackSpecialEffect("hearts_background", level)
    }

    if (hearts === 10 && !triggeredMilestones.has(10)) {
      setTriggeredMilestones((prev) => new Set([...prev, 10]))
      createPopup("milestone", { title: "대단해요!", message: "10개 달성! 진정한 응원왕의 시작!", icon: "🏆" })
      triggerScreenShake()
      createFloatingHearts(10)
      trackMilestone(10, level)
    }

    if (hearts === 15 && !triggeredMilestones.has(15)) {
      setTriggeredMilestones((prev) => new Set([...prev, 15]))
      createPopup("special", { title: "무지개 축하!", message: "15개 달성! 무지개가 나타났어요!", icon: "🌈" })
      setBackgroundEffect("rainbow")
      setTimeout(() => setBackgroundEffect("none"), 8000)
      trackMilestone(15, level)
      trackSpecialEffect("rainbow_background", level)
    }

    if (hearts === 20 && !triggeredMilestones.has(20)) {
      setTriggeredMilestones((prev) => new Set([...prev, 20]))
      createPopup("fireworks", { title: "폭죽 축제!", message: "20개 달성! 폭죽이 터져요!", icon: "🎆" })
      setBackgroundEffect("fireworks")
      createConfetti(20)
      setTimeout(() => setBackgroundEffect("none"), 10000)
      trackMilestone(20, level)
      trackSpecialEffect("fireworks_background", level)
    }

    if (hearts === 30 && !triggeredMilestones.has(30)) {
      setTriggeredMilestones((prev) => new Set([...prev, 30]))
      createPopup("special", { title: "별빛 축제!", message: "30개 달성! 별들이 춤춰요!", icon: "✨" })
      setBackgroundEffect("stars")
      setTimeout(() => setBackgroundEffect("none"), 12000)
      trackMilestone(30, level)
      trackSpecialEffect("stars_background", level)
    }

    if (hearts === 50 && !triggeredMilestones.has(50)) {
      setTriggeredMilestones((prev) => new Set([...prev, 50]))
      createPopup("milestone", { title: "황금 하트!", message: "50개 달성! 황금 응원왕이에요!", icon: "👑" })
      triggerScreenShake()
      createFloatingHearts(25)
      createConfetti(30)
      trackMilestone(50, level)
    }

    if (hearts === 75 && !triggeredMilestones.has(75)) {
      setTriggeredMilestones((prev) => new Set([...prev, 75]))
      createPopup("special", { title: "플래티넘 달성!", message: "75개 달성! 전설의 응원왕!", icon: "💎" })
      setBackgroundEffect("rainbow")
      setTimeout(() => setBackgroundEffect("fireworks"), 3000)
      setTimeout(() => setBackgroundEffect("none"), 15000)
      trackMilestone(75, level)
      trackSpecialEffect("rainbow_fireworks_background", level)
    }

    if (hearts === 100 && !triggeredMilestones.has(100)) {
      setTriggeredMilestones((prev) => new Set([...prev, 100]))
      createPopup("milestone", { title: "전설 달성!", message: "100개 달성! 응원의 전설이 되었어요!", icon: "🏆👑" })
      triggerScreenShake()
      setBackgroundEffect("fireworks")
      createFloatingHearts(50)
      createConfetti(50)
      trackMilestone(100, level)
      trackSpecialEffect("fireworks_background", level)
    }

    // 매 10개마다 작은 축하 (마일스톤이 아닌 경우에만)
    if (hearts > 10 && hearts % 10 === 0 && ![15, 20, 30, 50, 75, 100].includes(hearts)) {
      createFloatingHearts(5)
      createConfetti(10)
    }

    // 매 25개마다 특별 효과 (마일스톤이 아닌 경우에만)
    if (hearts > 25 && hearts % 25 === 0 && ![30, 50, 75, 100].includes(hearts)) {
      triggerScreenShake()
      setBackgroundEffect("stars")
      setTimeout(() => setBackgroundEffect("none"), 5000)
    }
  }

  // 화면 흔들기 효과
  const triggerScreenShake = () => {
    setScreenShake(true)
    setTimeout(() => setScreenShake(false), 1000)
  }

  // 떠다니는 하트 생성
  const createFloatingHearts = (count: number) => {
    const newHearts: FloatingHeart[] = []
    for (let i = 0; i < count; i++) {
      newHearts.push({
        id: floatingHeartsRef.current++,
        x: Math.random() * window.innerWidth,
        y: window.innerHeight + 50,
        size: Math.random() * 20 + 15,
        color: ["❤️", "💖", "💕", "💗", "💓", "💝"][Math.floor(Math.random() * 6)],
        speed: Math.random() * 3 + 2,
      })
    }
    setFloatingHearts((prev) => [...prev, ...newHearts])
  }

  // 컨페티 생성
  const createConfetti = (count: number) => {
    const newConfetti: Confetti[] = []
    const colors = ["🎉", "🎊", "✨", "⭐", "🌟", "💫", "🎈", "🎁"]
    for (let i = 0; i < count; i++) {
      newConfetti.push({
        id: confettiRef.current++,
        x: Math.random() * window.innerWidth,
        y: -50,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360,
        speed: Math.random() * 5 + 3,
      })
    }
    setConfetti((prev) => [...prev, ...newConfetti])
  }

  useEffect(() => {
    setCurrentDate(new Date())

    // 세션 ID 초기화
    const userSessionId = getOrCreateSessionId()
    setSessionId(userSessionId)

    // 사용자 세션 데이터 로드
    const loadSessionData = async () => {
      if (!userSessionId) return

      try {
        setIsLoadingSession(true)

        // 로컬 데이터 먼저 로드
        const localData = getLocalHeartData()
        setHeartCount(localData.heartCount)
        setEncouragementIndex(localData.encouragementIndex % encouragementMessages.length)
        setHeartLevel(calculateHeartLevel(localData.heartCount))

        // 이미 달성한 마일스톤들을 triggeredMilestones에 추가
        const currentHearts = localData.heartCount
        const achievedMilestones = [5, 10, 15, 20, 30, 50, 75, 100].filter((milestone) => currentHearts >= milestone)
        setTriggeredMilestones(new Set(achievedMilestones))

        // 서버 데이터 로드 시도
        const sessionResult = await getUserSessionData(userSessionId)

        if (sessionResult.success && sessionResult.data) {
          // 서버 데이터와 로컬 데이터 동기화
          const syncedData = syncSessionData(sessionResult.data)
          setHeartCount(syncedData.heartCount)
          setEncouragementIndex(syncedData.encouragementIndex % encouragementMessages.length)
          setHeartLevel(calculateHeartLevel(syncedData.heartCount))

          // 동기화된 데이터로 마일스톤 업데이트
          const syncedAchievedMilestones = [5, 10, 15, 20, 30, 50, 75, 100].filter(
            (milestone) => syncedData.heartCount >= milestone,
          )
          setTriggeredMilestones(new Set(syncedAchievedMilestones))
        }
      } catch (error) {
        console.error("Error loading session data:", error)
        // 에러 발생시 로컬 데이터 사용
        const localData = getLocalHeartData()
        setHeartCount(localData.heartCount)
        setEncouragementIndex(localData.encouragementIndex % encouragementMessages.length)
        setHeartLevel(calculateHeartLevel(localData.heartCount))

        // 에러 시에도 마일스톤 설정
        const currentHearts = localData.heartCount
        const achievedMilestones = [5, 10, 15, 20, 30, 50, 75, 100].filter((milestone) => currentHearts >= milestone)
        setTriggeredMilestones(new Set(achievedMilestones))
      } finally {
        setIsLoadingSession(false)
      }
    }

    // 실제 방문자 수 로드 및 증가
    const handleVisitorCount = async () => {
      try {
        setIsLoadingVisitors(true)

        // 현재 방문자 수 가져오기
        const currentCount = await getVisitorCount()
        if (currentCount.success) {
          setVisitorCount(currentCount.count)
        } else {
          setVisitorCount(0)
          console.log("Using default visitor count due to database error")
        }

        // 방문자 수 증가 시도
        const newCount = await incrementVisitorCount()
        if (newCount.success) {
          setTimeout(() => {
            setVisitorCount(newCount.count)
            setIsLoadingVisitors(false)
          }, 1500)
          trackVisitorCount(newCount.count)
        } else {
          console.log("Failed to increment visitor count, keeping current count")
          setIsLoadingVisitors(false)
        }
      } catch (error) {
        console.error("Error handling visitor count:", error)
        setVisitorCount(0)
        setIsLoadingVisitors(false)
      }
    }

    loadSessionData()
    handleVisitorCount()

    // 실시간 방문자 수 구독
    const subscription = supabase
      .channel("visitors")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "visitors" }, (payload) => {
        if (payload.new && typeof payload.new.count === "number") {
          setVisitorCount(payload.new.count)
        }
      })
      .subscribe()

    // 깜빡이는 텍스트
    const blinkInterval = setInterval(() => {
      setBlinkingText((prev) => !prev)
    }, 800)

    // 초기 팝업 생성
    setTimeout(() => {
      createPopup("visitor")
    }, 3000)

    return () => {
      clearInterval(blinkInterval)
      subscription.unsubscribe()
    }
  }, [])

  // 떠다니는 하트 애니메이션
  useEffect(() => {
    const interval = setInterval(() => {
      setFloatingHearts((prev) =>
        prev
          .map((heart) => ({
            ...heart,
            y: heart.y - heart.speed,
          }))
          .filter((heart) => heart.y > -100),
      )
    }, 50)
    return () => clearInterval(interval)
  }, [])

  // 컨페티 애니메이션
  useEffect(() => {
    const interval = setInterval(() => {
      setConfetti((prev) =>
        prev
          .map((conf) => ({
            ...conf,
            y: conf.y + conf.speed,
            rotation: conf.rotation + 5,
          }))
          .filter((conf) => conf.y < window.innerHeight + 100),
      )
    }, 50)
    return () => clearInterval(interval)
  }, [])

  // 세션 데이터 자동 저장 (하트 카운트나 응원 인덱스가 변경될 때)
  useEffect(() => {
    if (!sessionId || isLoadingSession) return

    const saveSessionData = async () => {
      try {
        const result = await updateUserSessionData(sessionId, heartCount, encouragementIndex)
        if (result.success) {
          console.log("Session data saved successfully")
          const sessionDuration = Date.now() - (sessionStartTime || Date.now())
          trackSessionData(heartCount, sessionDuration)
        } else {
          console.log("Session data save failed, using local storage only")
        }

        // 성공 여부와 관계없이 로컬 스토리지에는 항상 저장
        saveLocalHeartData(heartCount, encouragementIndex)
      } catch (error) {
        console.error("Error in saveSessionData:", error)
        // 에러가 발생해도 로컬 스토리지는 계속 사용
        saveLocalHeartData(heartCount, encouragementIndex)
      }
    }

    // 디바운스를 위한 타이머
    const timer = setTimeout(saveSessionData, 1000)
    return () => clearTimeout(timer)
  }, [heartCount, encouragementIndex, sessionId, isLoadingSession])

  // 마우스 트레일 효과
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const trailEmoji = heartLevel >= 5 ? "✨" : heartLevel >= 3 ? "💫" : "✨"
      const newTrail: MouseTrail = {
        id: mouseTrailRef.current++,
        x: e.clientX,
        y: e.clientY,
      }

      setMouseTrail((prev) => [...prev.slice(-8), newTrail])
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [heartLevel])

  // 마우스 트레일 자동 제거
  useEffect(() => {
    const interval = setInterval(() => {
      setMouseTrail((prev) => prev.slice(1))
    }, 100)
    return () => clearInterval(interval)
  }, [])

  const createPopup = (type: PopupWindow["type"], data?: any) => {
    // 이미 같은 타입의 팝업이 있으면 생성하지 않음
    if (activePopupTypes.has(type)) {
      return
    }

    const newPopup: PopupWindow = {
      id: Date.now(),
      type,
      x: Math.random() * (window.innerWidth - 300),
      y: Math.random() * (window.innerHeight - 200),
      isVisible: true,
      data,
    }

    setPopups((prev) => [...prev, newPopup])
    setActivePopupTypes((prev) => new Set([...prev, type]))
    trackPopup(type, "open")
  }

  const closePopup = (id: number) => {
    const popupToClose = popups.find((popup) => popup.id === id)
    if (popupToClose) {
      setActivePopupTypes((prev) => {
        const newSet = new Set(prev)
        newSet.delete(popupToClose.type)
        return newSet
      })
    }
    setPopups((prev) => prev.filter((popup) => popup.id !== id))
    if (popupToClose) {
      trackPopup(popupToClose.type, "close")
    }
  }

  const handleHeartClick = async () => {
    if (!sessionId) return

    try {
      // 서버에서 하트 카운트 증가
      const result = await incrementHeartCount(sessionId)

      if (result.success) {
        setHeartCount(result.heartCount)
        setEncouragementIndex(result.encouragementIndex % encouragementMessages.length)

        // 로컬 스토리지에도 저장 (백업)
        saveLocalHeartData(result.heartCount, result.encouragementIndex)

        // 특별 이벤트 트리거
        triggerSpecialEvent(result.heartCount)
      } else {
        // 서버 업데이트 실패시 로컬에서만 증가
        const newHeartCount = heartCount + 1
        const newEncouragementIndex = encouragementIndex + 1

        setHeartCount(newHeartCount)
        setEncouragementIndex(newEncouragementIndex % encouragementMessages.length)

        // 로컬 스토리지에 저장
        saveLocalHeartData(newHeartCount, newEncouragementIndex)

        // 특별 이벤트 트리거
        triggerSpecialEvent(newHeartCount)
      }

      // 로딩 바 시뮬레이션
      const currentHeartCount = result.success ? result.heartCount : heartCount + 1
      if (currentHeartCount % 5 === 0) {
        setShowLoading(true)
        setLoadingProgress(0)
        const loadingInterval = setInterval(() => {
          setLoadingProgress((prev) => {
            if (prev >= 100) {
              clearInterval(loadingInterval)
              setTimeout(() => setShowLoading(false), 1000)
              return 100
            }
            return prev + 10
          })
        }, 100)
      }
      trackHeartClick(currentHeartCount, heartLevel)
    } catch (error) {
      console.error("Error incrementing heart count:", error)
      // 에러 발생시 로컬에서만 증가
      const newHeartCount = heartCount + 1
      const newEncouragementIndex = encouragementIndex + 1

      setHeartCount(newHeartCount)
      setEncouragementIndex(newEncouragementIndex % encouragementMessages.length)

      // 로컬 스토리지에 저장
      saveLocalHeartData(newHeartCount, newEncouragementIndex)

      // 특별 이벤트 트리거
      triggerSpecialEvent(newHeartCount)
    }
  }

  const formatDate = (date: Date) => {
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일 ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`
  }

  const toggleMusic = () => {
    setIsMusicPlaying(!isMusicPlaying)
    if (!isMusicPlaying) {
      createPopup("music")
    }
    trackMusicToggle(!isMusicPlaying)
  }

  const getHeartLevelTitle = (level: number) => {
    const titles = [
      "새싹 응원단", // 1
      "열정 응원단", // 2
      "파워 응원단", // 3
      "슈퍼 응원단", // 4
      "울트라 응원단", // 5
      "마스터 응원단", // 6
      "그랜드 응원단", // 7
      "레전드 응원단", // 8
      "미라클 응원단", // 9
      "갓 응원단", // 10
    ]
    return titles[level - 1] || "응원단"
  }

  useEffect(() => {
    // 팝업 자동 닫기 (10초 후)
    const timer = setTimeout(() => {
      if (popups.length > 0) {
        const oldestPopup = popups[0]
        closePopup(oldestPopup.id)
      }
    }, 10000)

    return () => clearTimeout(timer)
  }, [popups])

  return (
    <div
      className={`min-h-screen bg-gray-300 p-2 font-mono text-sm relative overflow-hidden ${screenShake ? "animate-shake" : ""}`}
    >
      {/* 배경 효과들 */}
      {backgroundEffect === "rainbow" && (
        <div className="fixed inset-0 pointer-events-none z-10">
          <div className="w-full h-full bg-gradient-to-r from-red-400 via-yellow-400 via-green-400 via-blue-400 via-indigo-400 to-purple-400 opacity-20 animate-pulse"></div>
        </div>
      )}

      {backgroundEffect === "stars" && (
        <div className="fixed inset-0 pointer-events-none z-10">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute text-yellow-300 animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
              }}
            >
              ⭐
            </div>
          ))}
        </div>
      )}

      {backgroundEffect === "hearts" && (
        <div className="fixed inset-0 pointer-events-none z-10">
          {[...Array(30)].map((_, i) => (
            <div
              key={i}
              className="absolute text-pink-400 animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
              }}
            >
              💖
            </div>
          ))}
        </div>
      )}

      {backgroundEffect === "fireworks" && (
        <div className="fixed inset-0 pointer-events-none z-10">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute text-2xl animate-ping"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
              }}
            >
              🎆
            </div>
          ))}
        </div>
      )}

      {/* 떠다니는 하트들 */}
      {floatingHearts.map((heart) => (
        <div
          key={heart.id}
          className="fixed pointer-events-none z-40 animate-pulse"
          style={{
            left: heart.x,
            top: heart.y,
            fontSize: heart.size,
          }}
        >
          {heart.color}
        </div>
      ))}

      {/* 컨페티 */}
      {confetti.map((conf) => (
        <div
          key={conf.id}
          className="fixed pointer-events-none z-40"
          style={{
            left: conf.x,
            top: conf.y,
            transform: `rotate(${conf.rotation}deg)`,
          }}
        >
          {conf.color}
        </div>
      ))}

      {/* 마우스 트레일 */}
      {mouseTrail.map((trail, index) => (
        <div
          key={trail.id}
          className="fixed pointer-events-none z-50"
          style={{
            left: trail.x - 8,
            top: trail.y - 8,
            opacity: (index + 1) / mouseTrail.length,
          }}
        >
          <span className={`text-lg animate-pulse ${heartLevel >= 5 ? "text-yellow-400" : "text-pink-500"}`}>
            {heartLevel >= 7 ? "🌟" : heartLevel >= 5 ? "✨" : heartLevel >= 3 ? "💫" : "✨"}
          </span>
        </div>
      ))}

      {/* 스크롤 텍스트 */}
      {showScrollText && (
        <div
          className={`fixed top-0 left-0 w-full border-b-2 border-yellow-600 py-1 z-40 overflow-hidden ${heartLevel >= 5 ? "bg-gradient-to-r from-yellow-300 via-pink-300 to-purple-300" : "bg-yellow-300"}`}
        >
          <div className="animate-marquee whitespace-nowrap text-red-600 font-bold">
            {scrollMessages.slice(0, Math.min(scrollMessages.length, heartLevel + 3)).join(" • ")} •{" "}
            {scrollMessages.slice(0, Math.min(scrollMessages.length, heartLevel + 3)).join(" • ")}
          </div>
        </div>
      )}

      {/* Windows 98 Desktop Background Pattern */}
      <div className="fixed inset-0 opacity-10 pointer-events-none">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,.1) 2px, rgba(0,0,0,.1) 4px)`,
          }}
        ></div>
      </div>

      {/* 팝업 창들 */}
      {popups.map((popup) => (
        <div
          key={popup.id}
          className="fixed z-50 bg-gray-300 border-2 border-gray-400 shadow-lg animate-bounce"
          style={{ left: popup.x, top: popup.y }}
        >
          {/* 팝업 타이틀 바 */}
          <div
            className={`text-white px-2 py-1 flex items-center justify-between ${popup.type === "milestone" || popup.type === "special" || popup.type === "fireworks" ? "bg-gradient-to-r from-purple-600 to-pink-600" : "bg-gradient-to-r from-blue-600 to-blue-800"}`}
          >
            <span className="text-xs font-bold">
              {popup.type === "congratulations" && "🎉 축하합니다!"}
              {popup.type === "visitor" && "👥 방문자 알림"}
              {popup.type === "music" && "🎵 음악 재생"}
              {popup.type === "ad" && "📢 광고"}
              {popup.type === "milestone" && `${popup.data?.icon} ${popup.data?.title}`}
              {popup.type === "special" && `${popup.data?.icon} ${popup.data?.title}`}
              {popup.type === "fireworks" && `${popup.data?.icon} ${popup.data?.title}`}
            </span>
            <button
              className="w-4 h-4 bg-gray-300 border border-gray-600 text-black text-xs hover:bg-red-200"
              onClick={() => closePopup(popup.id)}
            >
              ✕
            </button>
          </div>

          {/* 팝업 내용 */}
          <div className="p-4 bg-white border border-gray-400 min-w-[250px]">
            {popup.type === "congratulations" && (
              <div className="text-center">
                <div className="text-2xl mb-2">🎊 축하합니다! 🎊</div>
                <div className="text-sm mb-2">하트 10개 달성!</div>
                <div className="text-xs text-gray-600">당신은 진정한 응원왕입니다!</div>
                <div className="text-xs text-blue-600 mt-2">💾 데이터가 자동 저장되었습니다!</div>
                <button
                  className="mt-2 px-3 py-1 bg-gray-300 border-2 border-gray-400 hover:border-gray-600 text-xs"
                  onClick={() => closePopup(popup.id)}
                >
                  확인
                </button>
              </div>
            )}

            {(popup.type === "milestone" || popup.type === "special" || popup.type === "fireworks") && (
              <div className="text-center">
                <div className="text-3xl mb-2">{popup.data?.icon}</div>
                <div className="text-lg mb-2 font-bold text-purple-800">{popup.data?.title}</div>
                <div className="text-sm mb-2 text-gray-700">{popup.data?.message}</div>
                <div className="text-xs text-blue-600 mb-2">레벨: {getHeartLevelTitle(heartLevel)}</div>
                <div className="text-xs text-green-600 mb-2">🎯 마일스톤 달성!</div>
                <button
                  className="px-3 py-1 bg-gradient-to-r from-purple-400 to-pink-400 text-white border-2 border-purple-600 hover:border-purple-800 text-xs rounded"
                  onClick={() => closePopup(popup.id)}
                >
                  멋져요! ✨
                </button>
              </div>
            )}

            {popup.type === "visitor" && (
              <div className="text-center">
                <div className="text-lg mb-2">🎯 방문자 알림</div>
                <div className="text-sm mb-2">
                  {isLoadingVisitors
                    ? "방문자 수를 확인하는 중..."
                    : `당신은 ${visitorCount.toLocaleString()}번째 방문자입니다!`}
                </div>
                <div className="text-xs text-gray-600 mb-2">
                  {isLoadingSession
                    ? "세션 데이터 로딩 중..."
                    : heartCount > 0
                      ? `이전에 ${heartCount}개의 하트를 남기셨네요! 💕`
                      : "특별한 응원 메시지를 받으셨습니다!"}
                </div>
                <div className="text-xs text-purple-600 mb-2">현재 레벨: {getHeartLevelTitle(heartLevel)}</div>
                <div className="text-xs text-green-600 mb-2">
                  달성한 마일스톤:{" "}
                  {Array.from(triggeredMilestones)
                    .sort((a, b) => a - b)
                    .join(", ")}
                  개
                </div>
                <button
                  className="px-3 py-1 bg-gray-300 border-2 border-gray-400 hover:border-gray-600 text-xs"
                  onClick={() => closePopup(popup.id)}
                >
                  닫기
                </button>
              </div>
            )}

            {popup.type === "music" && (
              <div className="text-center">
                <div className="text-lg mb-2">🎵 MIDI 음악</div>
                <div className="text-sm mb-2">배경음악이 재생중입니다</div>
                <div className="text-xs text-gray-600 mb-2">♪ ♫ ♪ ♫ ♪ ♫ ♪</div>
                <button
                  className="px-3 py-1 bg-gray-300 border-2 border-gray-400 hover:border-gray-600 text-xs"
                  onClick={() => {
                    setIsMusicPlaying(false)
                    closePopup(popup.id)
                  }}
                >
                  음악 끄기
                </button>
              </div>
            )}
          </div>
        </div>
      ))}

      {/* 로딩 바 */}
      {showLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-300 border-2 border-gray-400 p-4">
            <div className="text-sm mb-2">응원 에너지 충전중...</div>
            <div className="w-64 h-4 bg-gray-200 border border-gray-400">
              <div
                className={`h-full transition-all duration-100 ${heartLevel >= 5 ? "bg-gradient-to-r from-purple-600 to-pink-600" : "bg-blue-600"}`}
                style={{ width: `${loadingProgress}%` }}
              ></div>
            </div>
            <div className="text-xs mt-1 text-center">{loadingProgress}%</div>
          </div>
        </div>
      )}

      <div className={`transition-all duration-300 ${showScrollText ? "mt-8" : ""}`}>
        {/* Mail Client Window */}
        <div
          className={`max-w-4xl mx-auto bg-gray-300 border-2 border-gray-400 shadow-lg ${heartLevel >= 7 ? "shadow-2xl shadow-purple-500/50" : ""}`}
        >
          {/* Title Bar */}
          <div
            className={`text-white px-2 py-1 flex items-center justify-between ${heartLevel >= 5 ? "bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600" : "bg-gradient-to-r from-blue-600 to-blue-800"}`}
          >
            <div className="flex items-center space-x-2">
              <div
                className={`w-4 h-4 border border-gray-600 flex items-center justify-center text-xs ${heartLevel >= 3 ? "bg-gradient-to-r from-yellow-400 to-orange-400" : "bg-yellow-400"}`}
              >
                {heartLevel >= 7 ? "👑" : heartLevel >= 5 ? "⭐" : "📧"}
              </div>
              <span className="font-bold">응원 메일 - [받은편지함] - {getHeartLevelTitle(heartLevel)}</span>
              {isMusicPlaying && <span className="text-xs animate-pulse">♪ ♫</span>}
              {isLoadingSession && <span className="text-xs animate-pulse">💾 로딩중...</span>}
              {heartLevel >= 5 && <span className="text-xs animate-pulse">✨ 특별 모드 ✨</span>}
            </div>
            <div className="flex space-x-1">
              <button className="w-6 h-6 bg-gray-300 border border-gray-600 text-black text-xs hover:bg-gray-200">
                _
              </button>
              <button
                className="w-6 h-6 bg-gray-300 border border-gray-600 text-black text-xs hover:bg-gray-200"
                onClick={() => setIsMaximized(!isMaximized)}
              >
                {isMaximized ? "❐" : "□"}
              </button>
              <button className="w-6 h-6 bg-gray-300 border border-gray-600 text-black text-xs hover:bg-red-200">
                ✕
              </button>
            </div>
          </div>

          {/* Menu Bar */}
          <div className="bg-gray-300 border-b border-gray-400 px-2 py-1">
            <div className="flex space-x-4 text-xs">
              <span className="hover:bg-blue-600 hover:text-white px-2 py-1 cursor-pointer">파일(F)</span>
              <span className="hover:bg-blue-600 hover:text-white px-2 py-1 cursor-pointer">편집(E)</span>
              <span className="hover:bg-blue-600 hover:text-white px-2 py-1 cursor-pointer">보기(V)</span>
              <span className="hover:bg-blue-600 hover:text-white px-2 py-1 cursor-pointer">도구(T)</span>
              <span className="hover:bg-blue-600 hover:text-white px-2 py-1 cursor-pointer" onClick={toggleMusic}>
                🎵 음악({isMusicPlaying ? "ON" : "OFF"})
              </span>
              <span className="hover:bg-blue-600 hover:text-white px-2 py-1 cursor-pointer">도움말(H)</span>
              {heartLevel >= 5 && (
                <span className="hover:bg-purple-600 hover:text-white px-2 py-1 cursor-pointer text-purple-600 font-bold">
                  ✨ 특별메뉴 ✨
                </span>
              )}
            </div>
          </div>

          {/* Toolbar */}
          <div className="bg-gray-300 border-b border-gray-400 p-2 flex space-x-2">
            <button className="px-3 py-1 bg-gray-300 border-2 border-gray-400 hover:border-gray-600 text-xs flex items-center space-x-1">
              <span>📨</span>
              <span>새 메일</span>
            </button>
            <button className="px-3 py-1 bg-gray-300 border-2 border-gray-400 hover:border-gray-600 text-xs flex items-center space-x-1">
              <span>↩️</span>
              <span>답장</span>
            </button>
            <button
              className="px-3 py-1 bg-gray-300 border-2 border-gray-400 hover:border-gray-600 text-xs flex items-center space-x-1"
              onClick={() => createPopup("ad")}
            >
              <span>🎁</span>
              <span>이벤트</span>
            </button>
            <div className="border-l border-gray-400 mx-2"></div>
            <button
              className="px-3 py-1 bg-gray-300 border-2 border-gray-400 hover:border-gray-600 text-xs flex items-center space-x-1"
              onClick={() => setShowScrollText(!showScrollText)}
            >
              <span>📢</span>
              <span>공지 {showScrollText ? "끄기" : "켜기"}</span>
            </button>
            {heartLevel >= 3 && (
              <button
                className="px-3 py-1 bg-gradient-to-r from-purple-400 to-pink-400 text-white border-2 border-purple-600 hover:border-purple-800 text-xs flex items-center space-x-1"
                onClick={() => {
                  createFloatingHearts(5)
                  createConfetti(10)
                }}
              >
                <span>✨</span>
                <span>특별효과</span>
              </button>
            )}
          </div>

          {/* Mail List Header */}
          <div className="bg-gray-200 border-b border-gray-400 p-2">
            <div className="grid grid-cols-12 gap-2 text-xs font-bold">
              <div className="col-span-1">📎</div>
              <div className="col-span-3">보낸사람</div>
              <div className="col-span-4">제목</div>
              <div className="col-span-2">받은날짜</div>
              <div className="col-span-2">크기</div>
            </div>
          </div>

          {/* Selected Mail */}
          <div
            className={`text-white p-2 border-b border-gray-400 ${heartLevel >= 5 ? "bg-gradient-to-r from-purple-600 to-pink-600" : "bg-blue-600"}`}
          >
            <div className="grid grid-cols-12 gap-2 text-xs">
              <div className="col-span-1">💌</div>
              <div className="col-span-3">든든한응원단장@love.com</div>
              <div className="col-span-4">
                {blinkingText
                  ? `${heartLevel >= 7 ? "👑" : heartLevel >= 5 ? "⭐" : "🌟"} 화이팅! 응원 메시지 ${heartLevel >= 7 ? "👑" : heartLevel >= 5 ? "⭐" : "🌟"}`
                  : `${heartLevel >= 7 ? "💎" : heartLevel >= 5 ? "✨" : "✨"} 화이팅! 응원 메시지 ${heartLevel >= 7 ? "💎" : heartLevel >= 5 ? "✨" : "✨"}`}
              </div>
              <div className="col-span-2">{formatDate(currentDate)}</div>
              <div className="col-span-2">2.3KB</div>
            </div>
          </div>

          {/* Mail Content Area */}
          <div className="flex">
            {/* Mail Body */}
            <div className="flex-1 bg-white border-r border-gray-400">
              {/* Mail Header */}
              <div className="bg-gray-100 border-b border-gray-400 p-3 text-xs">
                <div className="space-y-1">
                  <div>
                    <strong>보낸사람:</strong> 든든한응원단장 &lt;cheerleader@love.com&gt;
                  </div>
                  <div>
                    <strong>받는사람:</strong> 열심히일하는친구 &lt;hardworker@office.com&gt;
                  </div>
                  <div>
                    <strong>제목:</strong> 🌟 화이팅! 응원 메시지 🌟
                  </div>
                  <div>
                    <strong>날짜:</strong> {formatDate(currentDate)}
                  </div>
                  <div>
                    <strong>응원 레벨:</strong> {getHeartLevelTitle(heartLevel)} (Lv.{heartLevel})
                  </div>
                  <div>
                    <strong>달성 마일스톤:</strong>{" "}
                    {Array.from(triggeredMilestones)
                      .sort((a, b) => a - b)
                      .join(", ")}
                    개
                  </div>
                  {sessionId && (
                    <div>
                      <strong>세션 ID:</strong> {sessionId.substring(0, 20)}...
                    </div>
                  )}
                </div>
              </div>

              {/* Mail Content */}
              <div className="p-4 bg-white">
                <div className="text-center mb-6">
                  <div
                    className={`inline-block border-2 p-4 mb-4 ${heartLevel >= 5 ? "bg-gradient-to-r from-yellow-100 via-pink-100 to-purple-100 border-purple-400" : "bg-yellow-100 border-yellow-400"}`}
                  >
                    <div className="text-2xl mb-2">
                      {heartLevel >= 7
                        ? "👑 황금 디지털 엽서 👑"
                        : heartLevel >= 5
                          ? "⭐ 특별 디지털 엽서 ⭐"
                          : "📮 디지털 엽서 📮"}
                    </div>
                    {!isLoadingSession && heartCount > 0 && (
                      <div className="text-xs text-green-600">💾 이전 데이터가 복원되었습니다!</div>
                    )}
                    <div className="text-xs text-purple-600 mt-1">
                      레벨 {heartLevel}: {getHeartLevelTitle(heartLevel)}
                    </div>
                    <div className="text-xs text-blue-600 mt-1">🎯 달성 마일스톤: {triggeredMilestones.size}개</div>
                  </div>
                </div>

                {/* Pixel Art Postcard */}
                <div
                  className={`border-4 p-6 mx-auto max-w-md relative ${heartLevel >= 7 ? "bg-gradient-to-br from-yellow-50 via-pink-50 to-purple-50 border-purple-600 shadow-lg shadow-purple-500/50" : heartLevel >= 5 ? "bg-gradient-to-br from-yellow-50 to-pink-50 border-pink-600" : "bg-yellow-50 border-yellow-600"}`}
                >
                  {/* Pixel Stamp */}
                  <div
                    className={`absolute top-2 right-2 w-12 h-16 border-2 flex flex-col items-center justify-center text-white text-xs ${heartLevel >= 7 ? "bg-gradient-to-b from-purple-500 to-pink-500 border-purple-700" : heartLevel >= 5 ? "bg-gradient-to-b from-pink-500 to-red-500 border-pink-700" : "bg-red-500 border-red-700"}`}
                  >
                    <div
                      className={`w-6 h-6 border mb-1 flex items-center justify-center ${heartLevel >= 5 ? "bg-yellow-300 border-yellow-500" : "bg-pink-300 border-pink-500"}`}
                    >
                      {heartLevel >= 7 ? "👑" : heartLevel >= 5 ? "⭐" : "❤️"}
                    </div>
                    <div>{heartLevel >= 5 ? "SUPER" : "LOVE"}</div>
                    <div>{currentDate.getFullYear()}</div>
                  </div>

                  {/* Pixel Postmark */}
                  <div
                    className={`absolute top-1 right-16 w-16 h-16 border-4 rounded-full flex items-center justify-center text-xs ${heartLevel >= 5 ? "border-purple-400 text-purple-600" : "border-red-400 text-red-600"}`}
                  >
                    <div className="text-center">
                      <div>{currentDate.getMonth() + 1}월</div>
                      <div>{currentDate.getDate()}</div>
                    </div>
                  </div>

                  {/* Main Message */}
                  <div className="text-center mb-4 pt-4">
                    <div
                      className={`text-4xl font-black mb-2 cursor-pointer hover:text-red-800 select-none pixel-text transform hover:scale-110 transition-transform ${heartLevel >= 7 ? "text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-600 to-yellow-600 animate-pulse" : heartLevel >= 5 ? "text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600" : "text-red-600"}`}
                      onClick={handleHeartClick}
                      style={{
                        textShadow:
                          heartLevel >= 5
                            ? "none"
                            : "2px 2px 0px #000, -1px -1px 0px #000, 1px -1px 0px #000, -1px 1px 0px #000",
                        fontFamily: "monospace",
                      }}
                    >
                      {heartLevel >= 7 ? "👑 화이팅! 👑" : heartLevel >= 5 ? "⭐ 화이팅! ⭐" : "화이팅!"}
                    </div>
                    <div
                      className={`text-sm font-bold mb-2 ${heartLevel >= 5 ? "text-purple-800" : "text-purple-800"}`}
                    >
                      {encouragementMessages[encouragementIndex]}
                    </div>
                    <div className="text-xs text-gray-700 leading-relaxed">
                      요즘 일이 많이 힘들다는 거 알고 있어요.
                      <br />
                      하지만 당신을 믿어요! 응원하고 있어요!
                      {heartLevel >= 5 && (
                        <>
                          <br />
                          <span className="text-purple-600 font-bold">당신은 정말 특별한 사람이에요! ✨</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Heart Counter - Pixel Style */}
                  <div className="text-center mb-4">
                    <div
                      className={`inline-block border-2 px-4 py-2 ${heartLevel >= 7 ? "bg-gradient-to-r from-purple-200 via-pink-200 to-yellow-200 border-purple-400" : heartLevel >= 5 ? "bg-gradient-to-r from-pink-200 to-purple-200 border-pink-400" : "bg-pink-200 border-pink-400"}`}
                    >
                      <div className="flex items-center space-x-2 text-xs">
                        <span>{heartLevel >= 7 ? "👑" : heartLevel >= 5 ? "⭐" : "❤️"}</span>
                        <span className="font-bold">
                          응원하트: {isLoadingSession ? "로딩중..." : `${heartCount}개`}
                        </span>
                        <span>{heartLevel >= 7 ? "👑" : heartLevel >= 5 ? "⭐" : "❤️"}</span>
                      </div>
                      <div className="text-xs text-purple-600 mt-1">
                        레벨 {heartLevel}: {getHeartLevelTitle(heartLevel)}
                      </div>
                    </div>
                    <div className="text-xs text-gray-600 mt-1">위의 "화이팅!" 클릭!</div>
                    <div className="text-xs text-blue-600 mt-1">💾 자동 저장됩니다</div>
                    {heartCount >= 5 && (
                      <div
                        className={`text-xs mt-1 font-bold ${blinkingText ? "text-red-600" : heartLevel >= 5 ? "text-purple-600" : "text-blue-600"}`}
                      >
                        🎉 대단해요! 계속 클릭해보세요! 🎉
                      </div>
                    )}
                    {heartLevel >= 5 && (
                      <div className="text-xs mt-1 text-purple-600 animate-pulse">
                        ✨ 특별 효과가 활성화되었어요! ✨
                      </div>
                    )}
                  </div>

                  {/* Address Section - Pixel Style */}
                  <div className="border-t-2 border-dashed border-gray-400 pt-3 mt-3">
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div className="bg-blue-50 border border-blue-200 p-2">
                        <div className="font-bold text-blue-800 mb-1">보낸사람:</div>
                        <div>든든한응원단장</div>
                        <div>우정로 123번길</div>
                        <div>응원시 사랑구</div>
                      </div>
                      <div className="bg-green-50 border border-green-200 p-2">
                        <div className="font-bold text-green-800 mb-1">받는사람:</div>
                        <div>열심히일하는친구</div>
                        <div>바쁜오피스빌딩</div>
                        <div>업무구 열정동</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  className={`text-center mt-6 p-3 border ${heartLevel >= 5 ? "bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 border-purple-200" : "bg-blue-50 border-blue-200"}`}
                >
                  <div className={`text-sm font-bold ${heartLevel >= 5 ? "text-purple-800" : "text-blue-800"}`}>
                    기억하세요!
                  </div>
                  <div className="text-xs text-gray-700 mt-1">
                    당신은 생각보다 훨씬 강해요! 틈틈이 쉬고, 물도 많이 마시고,
                    <br />
                    누군가 당신을 생각하고 있다는 걸 잊지 마세요!
                    {heartLevel >= 5 && (
                      <>
                        <br />
                        <span className="text-purple-600 font-bold">당신은 정말 특별하고 소중한 존재예요! 💜</span>
                      </>
                    )}
                  </div>
                  <div className="text-xs text-green-600 mt-2">💾 당신의 응원 기록이 안전하게 저장되고 있습니다!</div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="w-48 bg-gray-200 border-l border-gray-400">
              <div className="p-2 border-b border-gray-400 bg-gray-300">
                <div className="text-xs font-bold">폴더</div>
              </div>
              <div className="p-2 space-y-1 text-xs">
                <div
                  className={`text-white px-2 py-1 ${heartLevel >= 5 ? "bg-gradient-to-r from-purple-600 to-pink-600" : "bg-blue-600"}`}
                >
                  📥 받은편지함 (1)
                </div>
                <div className="px-2 py-1 hover:bg-gray-300 cursor-pointer">📤 보낸편지함</div>
                <div className="px-2 py-1 hover:bg-gray-300 cursor-pointer">📝 임시보관함</div>
                <div className="px-2 py-1 hover:bg-gray-300 cursor-pointer">🗑️휴지통</div>
              </div>

              {/* 응원 레벨 표시 */}
              <div className="p-2 border-t border-gray-400">
                <div
                  className={`p-2 text-center text-xs font-mono border ${heartLevel >= 7 ? "bg-gradient-to-r from-purple-900 via-pink-900 to-yellow-900 text-yellow-200 border-yellow-600" : heartLevel >= 5 ? "bg-gradient-to-r from-purple-900 to-pink-900 text-pink-200 border-pink-600" : "bg-purple-900 text-purple-200 border-purple-600"}`}
                >
                  <div className="text-purple-300 mb-1">
                    {heartLevel >= 7 ? "👑 LEGEND" : heartLevel >= 5 ? "⭐ SPECIAL" : "💜 LEVEL"}
                  </div>
                  <div className="text-lg font-bold">Lv.{heartLevel}</div>
                  <div className="text-xs mt-1">{getHeartLevelTitle(heartLevel)}</div>
                  {heartLevel >= 5 && <div className="text-xs mt-1 animate-pulse">✨ 특별 모드 ✨</div>}
                </div>
              </div>

              {/* 마일스톤 달성 현황 */}
              <div className="p-2 border-t border-gray-400">
                <div className="bg-green-900 text-green-200 p-2 text-center text-xs font-mono border border-green-600">
                  <div className="text-green-300 mb-1">🎯 MILESTONE</div>
                  <div className="text-sm font-bold">{triggeredMilestones.size}/8</div>
                  <div className="text-xs mt-1">달성 완료</div>
                  <div className="text-xs mt-1">
                    {Array.from(triggeredMilestones)
                      .sort((a, b) => a - b)
                      .map((milestone) => (
                        <span key={milestone} className="inline-block mr-1">
                          ✅
                        </span>
                      ))}
                  </div>
                </div>
              </div>

              {/* 방문자 카운터 */}
              <div className="p-2 border-t border-gray-400">
                <div className="bg-black text-green-400 p-2 text-center text-xs font-mono border border-gray-600">
                  <div className="text-yellow-400 mb-1">👥 VISITOR</div>
                  <div className="text-lg font-bold">
                    {isLoadingVisitors ? (
                      <span className="animate-pulse">Loading...</span>
                    ) : (
                      visitorCount.toLocaleString()
                    )}
                  </div>
                  <div className="text-xs mt-1">명이 방문했습니다</div>
                  {isLoadingVisitors && (
                    <div className="text-xs text-yellow-300 mt-1 animate-pulse">카운터 업데이트 중...</div>
                  )}
                </div>
              </div>

              {/* 세션 정보 */}
              <div className="p-2 border-t border-gray-400">
                <div className="bg-purple-900 text-purple-200 p-2 text-center text-xs font-mono border border-purple-600">
                  <div className="text-purple-300 mb-1">💾 SESSION</div>
                  <div className="text-sm font-bold">
                    {isLoadingSession ? <span className="animate-pulse">Loading...</span> : `${heartCount} Hearts`}
                  </div>
                  <div className="text-xs mt-1">자동 저장됨</div>
                </div>
              </div>

              {/* 웹링크 배너 */}
              <div className="p-2 border-t border-gray-400">
                <div className="text-xs font-bold mb-2">🔗 웹링크</div>
                <div className="space-y-1">
                  <a
                    href="https://github.com/baksohyeon"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`block text-white text-center py-1 text-xs cursor-pointer transition-all hover:scale-105 ${heartLevel >= 5 ? "bg-gradient-to-r from-purple-400 to-pink-500 hover:from-purple-500 hover:to-pink-600" : "bg-gradient-to-r from-pink-400 to-purple-500 hover:from-pink-500 hover:to-purple-600"}`}
                  >
                    💕 응원사이트 (GitHub)
                  </a>
                  <div className="bg-gradient-to-r from-blue-400 to-green-500 text-white text-center py-1 text-xs cursor-pointer hover:from-blue-500 hover:to-green-600 transition-all hover:scale-105">
                    🌟 힐링존
                  </div>
                  {heartLevel >= 5 && (
                    <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-center py-1 text-xs cursor-pointer hover:from-yellow-500 hover:to-orange-600 transition-all hover:scale-105">
                      ✨ 특별존
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Status Bar */}
          <div className="bg-gray-300 border-t border-gray-400 px-2 py-1 flex justify-between text-xs">
            <div className="flex space-x-4">
              <span>메일 1개</span>
              <span>|</span>
              <span>읽지 않음: 1개</span>
              <span>|</span>
              <span className={blinkingText ? "text-red-600" : heartLevel >= 5 ? "text-purple-600" : "text-blue-600"}>
                {isMusicPlaying ? "♪ 음악재생중" : "🔇 음악꺼짐"}
              </span>
              {heartLevel >= 5 && (
                <>
                  <span>|</span>
                  <span className="text-purple-600 font-bold animate-pulse">✨ 특별모드 활성 ✨</span>
                </>
              )}
            </div>
            <div className="flex space-x-2">
              <span>응원하트: {heartCount}개</span>
              <span>|</span>
              <span>레벨: {heartLevel}</span>
              <span>|</span>
              <span>마일스톤: {triggeredMilestones.size}/8</span>
              <span>|</span>
              <span>방문자: {visitorCount}명</span>
              <span>|</span>
              <span>💾 {isLoadingSession ? "로딩중" : "저장됨"}</span>
              <span>|</span>
              <span>{formatDate(currentDate)}</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          animation: marquee 15s linear infinite;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
          20%, 40%, 60%, 80% { transform: translateX(2px); }
        }
        .animate-shake {
          animation: shake 1s ease-in-out;
        }
      `}</style>
    </div>
  )
}
