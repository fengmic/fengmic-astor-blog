// functions/api/comments/[...path].ts - Handle GET/POST for comments

interface CommentData {
  post_id: string;
  author: string;
  email?: string;
  content: string;
}

interface Comment {
  id: number;
  post_id: string;
  author: string;
  email?: string;
  content: string;
  created_at: string;
  approved: boolean;
}

interface ResponseData {
  success: boolean;
  data?: Comment | Comment[];
  error?: string;
  message?: string;
}

/**
 * POST /api/comments - Create a new comment
 * Body: { post_id, author, email?, content }
 */
async function handlePost(
  request: Request,
  env: any
): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json() as CommentData;

    // Validation
    if (!body.post_id || !body.author || !body.content) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: post_id, author, content'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Sanitize inputs
    const postId = String(body.post_id).substring(0, 255);
    const author = String(body.author).substring(0, 100);
    const email = body.email ? String(body.email).substring(0, 255) : null;
    const content = String(body.content).substring(0, 5000);

    // Insert into D1
    const stmt = env.DB.prepare(
      `INSERT INTO comments (post_id, author, email, content, approved)
       VALUES (?, ?, ?, ?, 1)
       RETURNING id, post_id, author, email, content, created_at, approved`
    );

    const result = await stmt.bind(postId, author, email, content).first<Comment>();

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
        message: 'Comment created successfully'
      }),
      {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  } catch (error) {
    console.error('POST /api/comments error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * GET /api/comments?post_id=xxx - Fetch comments for a post
 */
async function handleGet(
  request: Request,
  env: any
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const postId = url.searchParams.get('post_id');

    if (!postId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required query parameter: post_id'
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Fetch approved comments for this post, ordered by newest first
    const stmt = env.DB.prepare(
      `SELECT id, post_id, author, email, content, created_at, approved
       FROM comments
       WHERE post_id = ? AND approved = 1
       ORDER BY created_at DESC
       LIMIT 100`
    );

    const comments = await stmt.bind(postId).all<Comment>();

    return new Response(
      JSON.stringify({
        success: true,
        data: comments.results || []
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  } catch (error) {
    console.error('GET /api/comments error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Handle OPTIONS for CORS preflight
 */
function handleOptions(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}

export default async function handler(
  request: Request,
  env: any
): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return handleOptions();
  }

  if (request.method === 'POST') {
    return handlePost(request, env);
  }

  if (request.method === 'GET') {
    return handleGet(request, env);
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: { 'Content-Type': 'application/json' }
  });
}
