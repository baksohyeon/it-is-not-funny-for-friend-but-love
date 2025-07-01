// Google Analytics 유틸리티 함수들

declare global {
  interface Window {
    gtag: (command: string, targetId: string, config?: Record<string, any>) => void
  }
}

// 페이지 뷰 추적
export const trackPageView = (url: string) => {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("config", "G-R97CE8L8MZ", {
      page_path: url,
    })
  }
}

// 이벤트 추적
export const trackEvent = (action: string, category: string, label?: string, value?: number) => {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", action, {
      event_category: category,
      event_label: label,
      value: value,
    })
  }
}

// 하트 클릭 이벤트 추적
export const trackHeartClick = (heartCount: number, level: number) => {
  trackEvent("heart_click", "engagement", `level_${level}`, heartCount)
}

// 마일스톤 달성 이벤트 추적
export const trackMilestone = (milestone: number, level: number) => {
  trackEvent("milestone_achieved", "achievement", `milestone_${milestone}`, level)
}

// 방문자 카운터 이벤트 추적
export const trackVisitorCount = (count: number) => {
  trackEvent("visitor_count", "engagement", "visitor_increment", count)
}

// 팝업 이벤트 추적
export const trackPopup = (popupType: string, action: "open" | "close") => {
  trackEvent(`popup_${action}`, "ui_interaction", popupType)
}

// 링크 클릭 이벤트 추적
export const trackLinkClick = (linkName: string, url: string) => {
  trackEvent("link_click", "navigation", linkName, undefined)

  // 외부 링크의 경우 추가 정보
  if (url.startsWith("http")) {
    trackEvent("external_link_click", "outbound", url)
  }
}

// 특별 효과 이벤트 추적
export const trackSpecialEffect = (effectType: string, level: number) => {
  trackEvent("special_effect", "visual", effectType, level)
}

// 음악 재생 이벤트 추적
export const trackMusicToggle = (isPlaying: boolean) => {
  trackEvent("music_toggle", "audio", isPlaying ? "play" : "pause")
}

// 세션 데이터 이벤트 추적
export const trackSessionData = (heartCount: number, sessionDuration: number) => {
  trackEvent("session_data", "engagement", "session_save", heartCount)

  // 세션 지속 시간 추적 (분 단위)
  const durationMinutes = Math.round(sessionDuration / 60000)
  if (durationMinutes > 0) {
    trackEvent("session_duration", "engagement", `${durationMinutes}_minutes`, durationMinutes)
  }
}
