<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# Project rules

- RecruitFlow was rebuilt on Lovable Cloud (replacing the original FastAPI backend) at the user's request — keeps everything in one live, previewable stack.
- Roles live in `user_roles` (super_admin/recruiter/candidate), assigned by a signup trigger; super_admin is never assignable via signup — prevents privilege escalation.
- Data access is enforced by RLS policies; the browser client queries tables directly — keeps authorization in the database, not the UI.
- Role dashboards live in `src/components/dashboards/` and are selected in `/dashboard` by role — one entry point per signed-in user.
