-- 방문자 카운터 테이블 생성
CREATE TABLE IF NOT EXISTS visitors (
  id SERIAL PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 초기 데이터 삽입 (이미 존재하지 않는 경우에만)
INSERT INTO visitors (id, count, last_updated) 
SELECT 1, 1337, NOW()
WHERE NOT EXISTS (SELECT 1 FROM visitors WHERE id = 1);

-- 방문자 수 증가 함수 생성
CREATE OR REPLACE FUNCTION increment_visitor_count()
RETURNS INTEGER AS $$
DECLARE
  new_count INTEGER;
BEGIN
  UPDATE visitors 
  SET count = count + 1, last_updated = NOW() 
  WHERE id = 1
  RETURNING count INTO new_count;
  
  IF new_count IS NULL THEN
    INSERT INTO visitors (id, count, last_updated) VALUES (1, 1338, NOW())
    RETURNING count INTO new_count;
  END IF;
  
  RETURN new_count;
END;
$$ LANGUAGE plpgsql;
