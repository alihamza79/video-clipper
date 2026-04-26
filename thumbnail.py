import os
import uuid
import time
import json
from openai import OpenAI
from PIL import Image


def _parse_json_response(text):
    """Clean and parse JSON from LLM response."""
    if text.startswith("```json"):
        text = text[7:]
    if text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    text = text.strip()

    start_idx = text.find('{')
    end_idx = text.rfind('}')
    if start_idx != -1 and end_idx != -1:
        text = text[start_idx:end_idx + 1]

    return json.loads(text)


def analyze_video_for_titles(api_key, video_path, transcript=None):
    """
    Transcribes a video and uses GPT-5.5 to suggest viral YouTube titles.
    If transcript is provided, skips Whisper transcription.
    """
    if transcript is None:
        from main import transcribe_video
        print("🎬 [Thumbnail] Transcribing video...")
        transcript = transcribe_video(video_path)
    else:
        print("🎬 [Thumbnail] Using pre-computed transcript (Whisper already done)...")

    client = OpenAI(api_key=api_key)

    prompt = f"""You are a YouTube title expert who creates viral, click-worthy titles.

Analyze this transcript, then suggest 10 YouTube titles that would maximize CTR (click-through rate).

TRANSCRIPT:
{transcript['text']}

RULES:
- Titles must be under 70 characters
- Use power words, curiosity gaps, and emotional triggers
- Mix styles: how-to, listicle, story-driven, controversial, question-based
- Make them specific to the actual content, not generic
- Include numbers where appropriate
- Consider the language of the video (detected: {transcript['language']})
- Titles should be in the SAME LANGUAGE as the video transcript

Also provide a brief summary of the video content (2-3 sentences).

After generating all 10 titles, pick the TOP 2 you most recommend and explain concisely WHY (CTR potential, emotional hook, uniqueness, etc.). Reference them by their 0-based index in the titles array.

OUTPUT JSON:
{{
    "titles": ["title1", "title2", ...],
    "transcript_summary": "Brief summary of the video content...",
    "language": "{transcript['language']}",
    "recommended": [
        {{"index": 0, "reason": "Why this title is best..."}},
        {{"index": 3, "reason": "Why this title is second best..."}}
    ]
}}"""

    print("🤖 [Thumbnail] Asking GPT-5.5 for title suggestions...")
    response = client.chat.completions.create(
        model="gpt-5.5",
        messages=[
            {"role": "system", "content": "You are a YouTube title expert. Return ONLY valid JSON."},
            {"role": "user", "content": prompt}
        ],
        response_format={"type": "json_object"},
    )

    segments = transcript.get("segments", [])
    video_duration = segments[-1]["end"] if segments else 0

    try:
        result = _parse_json_response(response.choices[0].message.content)
        result["transcript_summary"] = result.get("transcript_summary", "")
        result["language"] = result.get("language", transcript["language"])
        result["segments"] = segments
        result["video_duration"] = video_duration
        return result
    except json.JSONDecodeError:
        print(f"❌ [Thumbnail] Failed to parse titles JSON")
        return {
            "titles": ["Could not generate titles - please try again"],
            "transcript_summary": transcript["text"][:500],
            "language": transcript["language"],
            "segments": segments,
            "video_duration": video_duration
        }


def refine_titles(api_key, context, user_message, conversation_history=None):
    """
    Takes video context + user feedback and returns refined title suggestions.
    """
    client = OpenAI(api_key=api_key)

    history_text = ""
    if conversation_history:
        for msg in conversation_history:
            role = msg.get("role", "user")
            history_text += f"\n{role.upper()}: {msg['content']}"

    prompt = f"""You are a YouTube title expert. Based on the video context and the user's feedback, suggest 8 new refined YouTube titles.

VIDEO CONTEXT:
{context}

CONVERSATION HISTORY:{history_text}

USER'S NEW REQUEST:
{user_message}

RULES:
- Titles must be under 70 characters
- Incorporate the user's feedback/direction
- Keep titles viral and click-worthy
- If the user asks for a specific style, follow it
- Titles should be in the same language as the original content

OUTPUT JSON:
{{
    "titles": ["title1", "title2", ...]
}}"""

    response = client.chat.completions.create(
        model="gpt-5.5",
        messages=[
            {"role": "system", "content": "You are a YouTube title expert. Return ONLY valid JSON."},
            {"role": "user", "content": prompt}
        ],
        response_format={"type": "json_object"},
    )

    try:
        return _parse_json_response(response.choices[0].message.content)
    except json.JSONDecodeError:
        print(f"❌ [Thumbnail] Failed to parse refined titles")
        return {"titles": ["Could not refine titles - please try again"]}


def generate_thumbnail(api_key, title, session_id, face_image_path=None, bg_image_path=None, extra_prompt="", count=3, video_context=""):
    """
    Generates YouTube thumbnails using OpenAI image generation (DALL-E).
    Returns list of saved image paths (relative URLs).
    """
    client = OpenAI(api_key=api_key)

    output_dir = os.path.join("output", "thumbnails", session_id)
    os.makedirs(output_dir, exist_ok=True)

    context_block = ""
    if video_context:
        context_block = f"\nVIDEO CONTEXT: {video_context}\n"

    extra_block = ""
    if extra_prompt:
        extra_block = f"\nMANDATORY USER INSTRUCTIONS: {extra_prompt}\n"

    text_prompt = f"""Generate a professional, eye-catching YouTube thumbnail image.

VIDEO TITLE: "{title}"
{context_block}
TEXT ON THUMBNAIL: Based on the title, create a SHORT visual hook (1-5 words max) in ALL CAPS.
{extra_block}
DESIGN: Large bold high-contrast text, vibrant colors, professional YouTube thumbnail aesthetic, clean composition, NO clutter."""

    thumbnails = []
    last_error = None
    for i in range(count):
        print(f"🎨 [Thumbnail] Generating thumbnail {i + 1}/{count}...")
        try:
            response = client.images.generate(
                model="dall-e-3",
                prompt=text_prompt,
                size="1792x1024",
                quality="hd",
                n=1,
            )

            image_url = response.data[0].url

            import httpx
            img_response = httpx.get(image_url, timeout=30.0)
            filename = f"thumb_{i + 1}.jpg"
            filepath = os.path.join(output_dir, filename)
            with open(filepath, "wb") as f:
                f.write(img_response.content)
            thumbnails.append(f"/thumbnails/{session_id}/{filename}")
            print(f"✅ [Thumbnail] Saved: {filepath}")

        except Exception as e:
            last_error = str(e)
            print(f"❌ [Thumbnail] Generation {i + 1} failed: {e}")

    if not thumbnails and last_error:
        raise RuntimeError(f"All thumbnail generations failed. Last error: {last_error}")

    return thumbnails


def generate_youtube_description(api_key, title, transcript_segments, language, video_duration):
    """
    Uses GPT-5.5 to generate a YouTube description with chapter markers.
    """
    client = OpenAI(api_key=api_key)

    formatted_segments = []
    for seg in transcript_segments:
        start = seg.get("start", 0)
        mins = int(start // 60)
        secs = int(start % 60)
        timestamp = f"{mins}:{secs:02d}"
        formatted_segments.append(f"[{timestamp}] {seg.get('text', '').strip()}")

    segments_text = "\n".join(formatted_segments)

    dur_mins = int(video_duration // 60)
    dur_secs = int(video_duration % 60)
    duration_str = f"{dur_mins}:{dur_secs:02d}"

    prompt = f"""You are a YouTube SEO expert. Generate a complete YouTube video description.

VIDEO TITLE: "{title}"
VIDEO LANGUAGE: {language}
VIDEO DURATION: {duration_str}

TRANSCRIPT WITH TIMESTAMPS:
{segments_text}

REQUIREMENTS:
1. Write in the SAME LANGUAGE as the video ({language})
2. Start with a compelling 2-3 sentence summary/hook
3. Add relevant CTAs (subscribe, like, comment)
4. Generate YouTube CHAPTERS (first chapter at 0:00, min 3 chapters, 10s+ apart)
5. Add 5-10 relevant hashtags at the end
6. Keep under 5000 characters

OUTPUT: Return ONLY the description text, ready to paste into YouTube."""

    print("🤖 [Thumbnail] Generating YouTube description with chapters...")
    response = client.chat.completions.create(
        model="gpt-5.5",
        messages=[
            {"role": "system", "content": "You are a YouTube SEO expert. Return only the description text, no JSON or markdown wrappers."},
            {"role": "user", "content": prompt}
        ],
    )

    description = response.choices[0].message.content.strip()
    if description.startswith("```"):
        lines = description.split("\n")
        description = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])

    return {"description": description}
