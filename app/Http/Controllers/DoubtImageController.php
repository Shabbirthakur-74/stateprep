<?php

namespace App\Http\Controllers;

use App\Models\Doubt;
use App\Models\DoubtReply;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\Response;

/**
 * Photos attached to doubts and replies. Only the student who asked and team members with the Doubts section
 * can see them.
 */
class DoubtImageController extends Controller
{
    public function doubt(Request $request, Doubt $doubt): Response
    {
        return $this->serve($request, $doubt, $doubt->image_path);
    }

    public function reply(Request $request, DoubtReply $reply): Response
    {
        return $this->serve($request, $reply->doubt, $reply->image_path);
    }

    private function serve(Request $request, Doubt $doubt, ?string $path): Response
    {
        $user = $request->user();
        abort_unless($path && ($doubt->user_id === $user->id || $user->can('manage-doubts')), 404);

        $response = Storage::disk(Doubt::DISK)->response($path);
        $response->headers->set('X-Content-Type-Options', 'nosniff');

        return $response;
    }
}
