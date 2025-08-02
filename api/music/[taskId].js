// api/music/[taskId].js
// 간단한 메모리 스토리지 (실제로는 DB 사용 권장)
const musicStorage = {};

export default async function handler(req, res) {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  const { taskId } = req.query;
  
  if (req.method === 'GET') {
    // 실제로는 DB에서 조회
    const musicData = musicStorage[taskId];
    
    if (musicData) {
      res.status(200).json(musicData);
    } else {
      res.status(404).json({ 
        error: 'Music not found',
        message: 'Music data not yet available. Please wait for callback.'
      });
    }
  } else if (req.method === 'POST') {
    // Callback에서 호출하여 저장
    musicStorage[taskId] = req.body;
    res.status(200).json({ saved: true });
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}