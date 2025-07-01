"use server"

import { supabaseServer } from "@/lib/supabase-server"

export async function incrementVisitorCount() {
  try {
    // 현재 방문자 수 조회 시도
    const { data: currentData, error: selectError } = await supabaseServer
      .from("visitors")
      .select("count")
      .eq("id", 1)
      .single()

    // 테이블이나 데이터가 없는 경우 처리
    if (selectError) {
      if (selectError.message.includes("does not exist") || selectError.message.includes("No rows")) {
        // 초기 데이터 생성 시도
        const { data: insertData, error: insertError } = await supabaseServer
          .from("visitors")
          .upsert(
            {
              id: 1,
              count: 1,
              last_updated: new Date().toISOString(),
            },
            {
              onConflict: "id",
            },
          )
          .select("count")
          .single()

        if (insertError) {
          console.error("Error creating initial visitor data:", insertError)
          return { success: false, count: 0 }
        }

        return { success: true, count: insertData?.count || 1 }
      }

      console.error("Error getting current visitor count:", selectError)
      return { success: false, count: 0 }
    }

    // 방문자 수 증가
    const newCount = (currentData?.count || 0) + 1
    const { data: updateData, error: updateError } = await supabaseServer
      .from("visitors")
      .update({
        count: newCount,
        last_updated: new Date().toISOString(),
      })
      .eq("id", 1)
      .select("count")
      .single()

    if (updateError) {
      console.error("Error updating visitor count:", updateError)
      return { success: false, count: currentData?.count || 0 }
    }

    return { success: true, count: updateData?.count || newCount }
  } catch (error) {
    console.error("Unexpected error in incrementVisitorCount:", error)
    return { success: false, count: 0 }
  }
}

export async function getVisitorCount() {
  try {
    const { data, error } = await supabaseServer.from("visitors").select("count").eq("id", 1).single()

    if (error) {
      if (error.message.includes("does not exist") || error.message.includes("No rows")) {
        // 테이블이나 데이터가 없으면 초기값 반환
        console.log("Visitors table or data does not exist, returning default count")
        return { success: true, count: 0 }
      }

      console.error("Error getting visitor count:", error)
      return { success: false, count: 0 }
    }

    return { success: true, count: data?.count || 0 }
  } catch (error) {
    console.error("Unexpected error in getVisitorCount:", error)
    return { success: false, count: 0 }
  }
}
