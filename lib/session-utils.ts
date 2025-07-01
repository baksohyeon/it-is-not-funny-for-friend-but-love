"use client"

// 고유한 세션 ID 생성
export function generateSessionId(): string {
  const timestamp = Date.now().toString(36)
  const randomStr = Math.random().toString(36).substring(2, 15)
  return `session_${timestamp}_${randomStr}`
}

// 세션 ID 가져오기 또는 생성
export function getOrCreateSessionId(): string {
  if (typeof window === "undefined") return ""

  let sessionId = localStorage.getItem("user_session_id")

  if (!sessionId) {
    sessionId = generateSessionId()
    localStorage.setItem("user_session_id", sessionId)
  }

  return sessionId
}

// 세션 ID 초기화 (디버깅용)
export function resetSessionId(): string {
  if (typeof window === "undefined") return ""

  localStorage.removeItem("user_session_id")
  localStorage.removeItem("local_heart_count")
  localStorage.removeItem("local_encouragement_index")
  return getOrCreateSessionId()
}

// 로컬 스토리지에 하트 카운트 저장 (백업용)
export function saveLocalHeartData(heartCount: number, encouragementIndex: number): void {
  if (typeof window === "undefined") return

  localStorage.setItem("local_heart_count", heartCount.toString())
  localStorage.setItem("local_encouragement_index", encouragementIndex.toString())
}

// 로컬 스토리지에서 하트 카운트 불러오기
export function getLocalHeartData(): { heartCount: number; encouragementIndex: number } {
  if (typeof window === "undefined") return { heartCount: 0, encouragementIndex: 0 }

  const heartCount = Number.parseInt(localStorage.getItem("local_heart_count") || "0")
  const encouragementIndex = Number.parseInt(localStorage.getItem("local_encouragement_index") || "0")

  return { heartCount, encouragementIndex }
}

// 세션 데이터 동기화 (로컬과 서버 데이터 비교)
export function syncSessionData(serverData: { heart_count: number; encouragement_index: number } | null): {
  heartCount: number
  encouragementIndex: number
} {
  const localData = getLocalHeartData()

  if (!serverData) {
    // 서버 데이터가 없으면 로컬 데이터 사용
    return localData
  }

  // 서버 데이터와 로컬 데이터 중 더 큰 값 사용 (데이터 손실 방지)
  const heartCount = Math.max(serverData.heart_count, localData.heartCount)
  const encouragementIndex = Math.max(serverData.encouragement_index, localData.encouragementIndex)

  // 동기화된 데이터를 로컬에 저장
  saveLocalHeartData(heartCount, encouragementIndex)

  return { heartCount, encouragementIndex }
}
