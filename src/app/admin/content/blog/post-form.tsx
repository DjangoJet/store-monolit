"use client";

import { useActionState } from "react";
import {
  createPostAction,
  updatePostAction,
  type ContentState,
} from "@/modules/content/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export interface PostFormData {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string;
  coverUrl: string | null;
  status: string;
}

export function PostForm({ post }: { post?: PostFormData }) {
  const action = post ? updatePostAction : createPostAction;
  const [state, formAction, pending] = useActionState<ContentState, FormData>(
    action,
    undefined,
  );

  return (
    <form action={formAction} className="max-w-2xl space-y-4">
      {post && <input type="hidden" name="id" value={post.id} />}

      <div className="space-y-2">
        <Label htmlFor="title">Tytuł *</Label>
        <Input id="title" name="title" defaultValue={post?.title} required />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {post && (
          <div className="space-y-2">
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" name="slug" defaultValue={post.slug} />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select id="status" name="status" defaultValue={post?.status ?? "DRAFT"}>
            <option value="DRAFT">Szkic</option>
            <option value="PUBLISHED">Opublikowany</option>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="coverUrl">URL okładki</Label>
        <Input id="coverUrl" name="coverUrl" defaultValue={post?.coverUrl ?? ""} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="excerpt">Zajawka</Label>
        <Textarea id="excerpt" name="excerpt" rows={2} defaultValue={post?.excerpt ?? ""} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="body">Treść (Markdown/tekst)</Label>
        <Textarea id="body" name="body" rows={12} defaultValue={post?.body} />
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Zapisywanie..." : post ? "Zapisz" : "Utwórz"}
        </Button>
        {state?.error && <span className="text-sm text-destructive">{state.error}</span>}
        {state?.success && <span className="text-sm text-green-600">{state.success}</span>}
      </div>
    </form>
  );
}
