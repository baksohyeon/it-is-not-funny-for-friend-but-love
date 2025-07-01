"use server"

import { supabaseServer } from "@/lib/supabase-server"

// 에러 객체를 안전하게 문자열로 변환하는 헬퍼 함수
function getErrorMessage(error: any): string {
  if (!error) return "Unknown error"

  if (typeof error === "string") return error

  if (error.message) return error.message

  if (error.details) return error.details

  if (error.hint) return error.hint

  // 에러 객체를 JSON으로 변환해서 내용 확인
  try {
    return JSON.stringify(error, null, 2)
  } catch {
    return error.toString()
  }
}

// 테이블 존재 여부 확인 함수
async function checkTableExists(tableName: string): Promise<boolean> {
  try {
    const { data, error } = await supabaseServer.from(tableName).select("*").limit(1)

    // 에러가 없으면 테이블이 존재
    if (!error) return true

    const errorMessage = getErrorMessage(error)

    // 테이블이 존재하지 않는 경우의 에러 메시지들
    if (
      errorMessage.includes("does not exist") ||
      errorMessage.includes("relation") ||
      errorMessage.includes("table") ||
      errorMessage.includes("42P01") // PostgreSQL error code for undefined table
    ) {
      return false
    }

    // 다른 에러는 테이블이 존재하지만 다른 문제
    return true
  } catch (error) {
    console.error("Error checking table existence:", getErrorMessage(error))
    return false
  }
}

export async function getUserSessionData(sessionId: string) {
  try {
    if (!sessionId) {
      return { success: false, data: null }
    }

    // 먼저 테이블 존재 여부 확인
    const tableExists = await checkTableExists("user_sessions")

    if (!tableExists) {
      console.log("user_sessions table does not exist, returning default values")
      return { success: true, data: { heart_count: 0, encouragement_index: 0 } }
    }

    const { data, error } = await supabaseServer
      .from("user_sessions")
      .select("heart_count, encouragement_index")
      .eq("session_id", sessionId)
      .single()

    if (error) {
      const errorMessage = getErrorMessage(error)
      console.log("getUserSessionData error:", errorMessage)

      if (errorMessage.includes("No rows")) {
        // 새 사용자 세션 생성 시도
        const { data: newData, error: insertError } = await supabaseServer
          .from("user_sessions")
          .insert({
            session_id: sessionId,
            heart_count: 0,
            encouragement_index: 0,
            last_updated: new Date().toISOString(),
          })
          .select("heart_count, encouragement_index")
          .single()

        if (insertError) {
          console.error("Error creating new session:", getErrorMessage(insertError))
          return { success: true, data: { heart_count: 0, encouragement_index: 0 } }
        }

        return { success: true, data: newData }
      }

      // 다른 에러의 경우 기본값 반환
      return { success: true, data: { heart_count: 0, encouragement_index: 0 } }
    }

    return { success: true, data }
  } catch (error) {
    console.error("Unexpected error in getUserSessionData:", getErrorMessage(error))
    return { success: true, data: { heart_count: 0, encouragement_index: 0 } }
  }
}

export async function updateUserSessionData(sessionId: string, heartCount: number, encouragementIndex: number) {
  try {
    if (!sessionId) {
      console.log("No session ID provided, skipping save")
      return { success: false }
    }

    // 먼저 테이블 존재 여부 확인
    const tableExists = await checkTableExists("user_sessions")

    if (!tableExists) {
      console.log("user_sessions table does not exist, skipping save")
      return { success: true } // 테이블이 없어도 성공으로 처리 (로컬 저장소 사용)
    }

    const { error } = await supabaseServer.from("user_sessions").upsert(
      {
        session_id: sessionId,
        heart_count: heartCount,
        encouragement_index: encouragementIndex,
        last_updated: new Date().toISOString(),
      },
      {
        onConflict: "session_id",
      },
    )

    if (error) {
      const errorMessage = getErrorMessage(error)
      console.error("Error updating session data:", errorMessage)

      // 특정 에러들은 성공으로 처리 (로컬 저장소로 대체)
      if (
        errorMessage.includes("does not exist") ||
        errorMessage.includes("relation") ||
        errorMessage.includes("table")
      ) {
        console.log("Table-related error, falling back to local storage")
        return { success: true }
      }

      return { success: false }
    }

    return { success: true }
  } catch (error) {
    console.error("Unexpected error in updateUserSessionData:", getErrorMessage(error))
    return { success: true } // 에러가 발생해도 앱이 계속 동작하도록
  }
}

export async function incrementHeartCount(sessionId: string) {
  try {
    if (!sessionId) {
      return { success: false, heartCount: 0, encouragementIndex: 0 }
    }

    // 먼저 테이블 존재 여부 확인
    const tableExists = await checkTableExists("user_sessions")

    if (!tableExists) {
      console.log("user_sessions table does not exist, using local storage only")
      return { success: false, heartCount: 1, encouragementIndex: 1 }
    }

    // 현재 데이터 가져오기
    const { data: currentData, error: selectError } = await supabaseServer
      .from("user_sessions")
      .select("heart_count, encouragement_index")
      .eq("session_id", sessionId)
      .single()

    if (selectError) {
      const errorMessage = getErrorMessage(selectError)
      console.log("incrementHeartCount select error:", errorMessage)

      if (errorMessage.includes("No rows")) {
        // 새 세션 생성하고 하트 1개로 시작
        const { data: newData, error: insertError } = await supabaseServer
          .from("user_sessions")
          .insert({
            session_id: sessionId,
            heart_count: 1,
            encouragement_index: 1,
            last_updated: new Date().toISOString(),
          })
          .select("heart_count, encouragement_index")
          .single()

        if (insertError) {
          console.error("Error creating session with heart:", getErrorMessage(insertError))
          return { success: false, heartCount: 1, encouragementIndex: 1 }
        }

        return {
          success: true,
          heartCount: newData.heart_count,
          encouragementIndex: newData.encouragement_index,
        }
      }

      // 다른 에러의 경우 로컬에서만 처리
      return { success: false, heartCount: 1, encouragementIndex: 1 }
    }

    // 하트 카운트 증가
    const newHeartCount = currentData.heart_count + 1
    const newEncouragementIndex = currentData.encouragement_index + 1

    const { data: updateData, error: updateError } = await supabaseServer
      .from("user_sessions")
      .update({
        heart_count: newHeartCount,
        encouragement_index: newEncouragementIndex,
        last_updated: new Date().toISOString(),
      })
      .eq("session_id", sessionId)
      .select("heart_count, encouragement_index")
      .single()

    if (updateError) {
      const errorMessage = getErrorMessage(updateError)
      console.error("Error updating heart count:", errorMessage)
      return {
        success: false,
        heartCount: newHeartCount,
        encouragementIndex: newEncouragementIndex,
      }
    }

    return {
      success: true,
      heartCount: updateData.heart_count,
      encouragementIndex: updateData.encouragement_index,
    }
  } catch (error) {
    console.error("Unexpected error in incrementHeartCount:", getErrorMessage(error))
    return { success: false, heartCount: 1, encouragementIndex: 1 }
  }
}
