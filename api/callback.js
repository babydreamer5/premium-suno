// api/callback.js
export default async function handler(req, res) {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method === 'POST') {
    try {
      const callbackData = req.body;
      console.log('Kie.ai Callback 받음:', JSON.stringify(callbackData, null, 2));
      
      // taskId 추출
      const taskId = callbackData.data?.task_id;
      
      if (taskId) {
        // 음악 데이터를 저장하기 위해 내부 API 호출
        const saveResponse = await fetch(`${req.headers.origin || 'http://localhost:3000'}/api/music/${taskId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(callbackData)
        });
        
        console.log('음악 데이터 저장 결과:', saveResponse.status);
      }
      
      res.status(200).json({ 
        received: true,
        message: 'Callback received successfully',
        taskId: taskId
      });
    } catch (error) {
      console.error('Callback 처리 오류:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}