# QuantEcon fork of `myst-theme` — maintenance guide

This fork lets QuantEcon fix and extend the MyST themes (`book-theme`, `article-theme`) and the `myst-to-react` / `@myst-theme/*` packages before the changes land in `jupyter-book/myst-theme`, and ships the built themes that QuantEcon's books use.

It follows the rules of the [QuantEcon/mystmd fork](https://github.com/QuantEcon/mystmd/blob/main/quantecon/README.md): features are developed on short-lived branches off this fork's `main`, squash-merged, and the branch is deleted. Upstream PRs are prepared later by **cherry-picking** squash commits from `main` onto a fresh branch off `upstream/main`. Read that guide for the reasoning; this one records the commands for this repo and the one difference, the build-only `release/v1.4` branch.

> **About this folder.** `quantecon/` doubles as a local scratch space. By default everything is gitignored; only the files in [`.gitignore`](.gitignore)'s allow-list are tracked — [`README.md`](README.md), [`VERSION.yml`](VERSION.yml), [`UPSTREAM-PRS.yml`](UPSTREAM-PRS.yml), and [`.gitignore`](.gitignore) itself. To track something new intentionally, add it to the allow-list.

## The two tracker files

| File                                   | Question it answers                                                                                                                                                 |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`VERSION.yml`](VERSION.yml)           | _What QuantEcon squash commits are in our `main`, and which `qe-vN` theme release carries them?_                                                                    |
| [`UPSTREAM-PRS.yml`](UPSTREAM-PRS.yml) | _How do we plan to ship those squash commits upstream?_ Bundles squashes into upstream PR candidates, records cherry-pick order, tracks upstream PR / merge status. |

Keep them in sync — cross-reference is by squash-commit SHA. They are maintained exactly as in the mystmd fork: every feature or bug fix that lands on `main` gets a `merged_features` row in `VERSION.yml` and a place in some candidate's `commits` in `UPSTREAM-PRS.yml`. Status runs `planned` → `pending` → `open` → `merged`.

## How the books use the fork

A book points `site.template` at the theme zip on one of this fork's releases:

```yaml
site:
  template: https://github.com/QuantEcon/myst-theme/releases/download/qe-v1/book-theme.zip
```

mystmd downloads and unpacks the zip, as it does for the stock `book-theme`. The zip is pinned: unlike `template: book-theme`, which follows whatever `myst-templates/book-theme` holds on the day of the build, a book only changes theme when its `site.template` line changes.

The zips are built by upstream's own [`theme-assets.yml`](../.github/workflows/theme-assets.yml): **publishing a GitHub release** builds `book-theme.zip` and `article-theme.zip` from the tagged commit and attaches them to the release.

`quantecon-theme.mystmd` does not use this fork; it installs `@myst-theme/*` from npm and carries its own patches.

## Branching model

| Branch             | Purpose                                                                                                                                                                                                                               |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `main`             | `upstream/main` **plus** all squash-merged QuantEcon features. Synced from upstream by merge.                                                                                                                                         |
| `feature/<name>`   | One short-lived branch per logical patch, **branched from `origin/main`**, PR'd against `QuantEcon/myst-theme:main`, squash-merged, deleted.                                                                                          |
| `upstream/<topic>` | Short-lived, **branched from `upstream/main`**, carrying cherry-picked squash commits for a PR against `jupyter-book/myst-theme:main`. Deleted once that PR resolves.                                                                 |
| `release/v1.4`     | **Build-only.** Upstream's `myst-to-react@1.4.1` release commit (`1c3581db`) plus cherry-picks of `main`'s QuantEcon squash commits, in the order they landed. `qe-vN` tags are cut here while it exists. Nothing is developed on it. |

### Why `release/v1.4` exists

After 1.4.1, upstream `main` moved to React Router 8. Themes built from it stop with "Your version of mystmd (or jupyter-book) does not support this version of the MyST theme" when mystmd runs a static build (upstream jupyter-book/myst-theme#977), and no mystmd yet runs them: upstream is pairing the next theme release with a mystmd change (see jupyter-book/mystmd#3085). A theme built from `main` would therefore break every book.

So the books' themes are built from `release/v1.4` until QuantEcon/mystmd syncs to a mystmd that runs the new themes. Then cut `qe-vN` tags on `main` instead, delete `release/v1.4`, and remove this section and the `release_branch` block in `VERSION.yml`.

## Workflows

Upstream's `Release` workflow (`release.yml`) is **disabled** in this fork's Actions settings, as it is in QuantEcon/mystmd: on every push to `main` it runs changesets (npm publishing, "Version Packages" PRs) and refreshes a rolling `myst-to-react@main` prerelease. Keep it disabled. `CI` runs on pull requests, and `Publish theme assets to GitHub Release` (`theme-assets.yml`) must stay enabled, because it builds the zips.

## Regular workflow

### Develop a feature

```bash
git fetch origin
git switch --no-track -c feature/<name> origin/main
bun install --frozen-lockfile
# make your changes; add a changeset with `bunx changeset` (the upstream PR needs one)
bun run build && bun run test
git push origin HEAD:refs/heads/feature/<name>
```

Open a PR with **base `QuantEcon/myst-theme:main`** (pass `--repo QuantEcon/myst-theme` to `gh pr create`; without it, `gh` may target the upstream parent). Squash-merge, delete the branch, then add the squash commit to both tracker files.

To check a change in a book before it is released, build the theme from the branch with `make build-book` and point a book's `site.template` at the local `.deploy/book` folder.

### Sync `main` with upstream

```bash
git fetch upstream
git switch main
git merge upstream/main      # a merge commit, never a fast-forward or squash
git push origin main
```

> **Do not use the GitHub "Sync fork" button.** It offers to discard the commits that diverge from upstream, which deletes our features. If a sync has to go through a PR, merge it with **"Create a merge commit"**.

`release/v1.4` is never synced; it only receives cherry-picks.

## Cutting a `qe-vN` release

Do the metadata first, so the tagged tree is self-consistent:

1. **Metadata PR on `main`.** In `VERSION.yml`, bump `qe_version` to `qe-v<N+1>`, refresh `upstream_base` / `upstream_commit`, and set `tag: qe-v<N+1>` on each untagged `merged_features` entry it includes. For the upstream fields, after `git fetch upstream --tags`, run `git describe --tags --match 'myst-to-react@*' "$(git merge-base origin/main upstream/main)"`: output like `myst-to-react@1.4.1-19-g1c50887c` means `upstream_base: myst-to-react@1.4.1`, `upstream_commit: 1c50887c`.
2. **Squash-merge it.**
3. **Bring `release/v1.4` up to date** by cherry-picking, in order, every `main` squash commit not yet on it (the features and the metadata commit):
   ```bash
   git switch release/v1.4
   git cherry-pick <sha-1> [<sha-2> …]
   bun install --frozen-lockfile && bun run build && bun run test
   git push origin release/v1.4
   ```
4. **Tag and publish** the release branch's tip. Publishing runs `theme-assets.yml`, which attaches the zips:
   ```bash
   git tag qe-v<N+1> -m "qe-v<N+1>: <summary>"
   git push origin qe-v<N+1>
   gh release create qe-v<N+1> --repo QuantEcon/myst-theme --verify-tag --title qe-v<N+1> --notes "<summary>"
   ```
5. **Check the zip, then move the books.** Once the run has attached `book-theme.zip`, build a book with the new URL and compare it with its current build before opening the books' `site.template` PRs.

(Once `release/v1.4` is retired, tag the `main` commit from step 2 instead and skip step 3.)

## Opening an upstream PR

1. Look up the candidate in `UPSTREAM-PRS.yml`; its `commits` are the squash SHAs to cherry-pick, in order.
2. `git fetch upstream && git switch --no-track -c upstream/<topic> upstream/main`
3. `git cherry-pick <sha-1> [<sha-2> …]`
4. `git push origin HEAD:refs/heads/upstream/<topic>`, then open a PR with **base `jupyter-book/myst-theme:main`** and **compare `QuantEcon/myst-theme:upstream/<topic>`**. Set the candidate's `status: open` and fill in `upstream.pr` / `upstream.branch`.

### When upstream merges it

Sync `main` with upstream, set the candidate's `status: merged` with `upstream.pr` and `upstream.merged_sha`, and delete the `upstream/<topic>` branch. While `release/v1.4` exists it keeps its cherry-pick, since upstream's merge lands only in the new themes.
