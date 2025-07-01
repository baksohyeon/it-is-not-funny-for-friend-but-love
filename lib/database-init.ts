import { supabaseServer } from "@/lib/supabase-server"

export async function initializeDatabase() {
  try {
    // 테이블 생성
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS visitors (
        id SERIAL PRIMARY KEY,
        count INTEGER NOT NULL DEFAULT 0,
        last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `

    const { error: createError } = await supabaseServer.rpc("exec_sql", {
      sql: createTableQuery,
    })

    if (createError) {
      console.log("Creating table with direct query...")
      // RPC가 실패하면 직접 테이블 생성 시도
      const { error: directError } = await supabaseServer.from("visitors").select("count").limit(1)

      if (directError && directError.message.includes("does not exist")) {
        // 테이블이 없으면 수동으로 생성 (이 방법은 제한적이지만 fallback으로 사용)
        console.log("Table does not exist, will handle in server action")
      }
    }

    // 초기 데이터 확인 및 삽입
    const { data: existingData, error: selectError } = await supabaseServer
      .from("visitors")
      .select("*")
      .eq("id", 1)
      .single()

    if (selectError && !selectError.message.includes("does not exist")) {
      console.error("Error checking existing data:", selectError)
    }

    if (!existingData) {
      // 초기 데이터 삽입
      const { error: insertError } = await supabaseServer
        .from("visitors")
        .insert({ id: 1, count: 0, last_updated: new Date().toISOString() })

      if (insertError) {
        console.error("Error inserting initial data:", insertError)
      }
    }

    return { success: true }
  } catch (error) {
    console.error("Error initializing database:", error)
    return { success: false, error }
  }
}
