const API_URL = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
const API_KEY = '47ed6a7d76de494281c8af552468d7de.tSsy4IaQLannMiro';

const SYSTEM_PROMPT = `You are a friendly NPC in a voxel game called RatitaCraft. You are a cute rat-person character who lives in a blocky world. Keep responses very short (1-2 sentences max). Be playful, cheerful, and a bit mischievous like a rat. You love cheese, squeaking, and exploring. Sometimes make rat noises like *squeak* or *nibbles*. Never break character.`;

export async function askGLM(agentName, playerName, message) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
            },
            body: JSON.stringify({
                model: 'glm-4-flash',
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT + ` Your name is ${agentName}. The player talking to you is ${playerName}.` },
                    { role: 'user', content: message },
                ],
                max_tokens: 80,
                temperature: 0.8,
            }),
        });

        if (!response.ok) {
            const err = await response.text();
            console.error('GLM API error:', err);
            return getFallbackResponse(agentName);
        }

        const data = await response.json();
        if (data.choices && data.choices[0] && data.choices[0].message) {
            return data.choices[0].message.content;
        }
        return getFallbackResponse(agentName);
    } catch (e) {
        console.error('GLM chat error:', e);
        return getFallbackResponse(agentName);
    }
}

function getFallbackResponse(name) {
    const fallbacks = [
        `${name}: *squeak* Hmm, I zoned out for a sec!`,
        `${name}: Sorry, rat brain freeze! What were we talking about?`,
        `${name}: *twitches whiskers* I'm having trouble thinking right now!`,
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}
