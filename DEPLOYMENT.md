# @vue-pivottable/subtotal-renderer 배포 가이드

이 문서는 NPM 패키지 배포를 위한 단계별 가이드입니다.

## 현재 상태

| 항목 | 상태 | 비고 |
|------|------|------|
| GitHub 레포 | ✅ 완료 | vue-pivottable/subtotal-renderer |
| 워크플로우 파일 | ✅ 완료 | publish-init.yml, publish.yml |
| release-it 설정 | ✅ 완료 | .release-it.json |
| 최초 NPM 배포 | ⬜ 대기 | NPM_TOKEN 필요 |
| OIDC Trusted Publishing | ⬜ 대기 | 최초 배포 후 설정 |

## 배포 아키텍처

```
[최초 배포 - 1회]
publish-init.yml → NPM_TOKEN → npm publish --tag beta

[이후 배포 - 자동]
develop push → publish.yml → OIDC → release-it --preRelease=beta
main push    → publish.yml → OIDC → release-it (정식 릴리즈)
```

---

## 1단계: 최초 배포 (NPM Token 사용)

### 1.1 NPM Access Token 생성

1. [npmjs.com](https://www.npmjs.com) 로그인
2. 프로필 → **Access Tokens** → **Generate New Token**
3. 타입: **Automation** (CI/CD용)
4. 토큰 복사 (한 번만 표시됨)

### 1.2 GitHub Secret 추가

1. GitHub 레포지토리 → **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret** 클릭
3. 설정:
   - Name: `NPM_TOKEN`
   - Value: 복사한 NPM 토큰

### 1.3 최초 배포 실행

1. GitHub → **Actions** 탭
2. 왼쪽에서 **Initial Publish (One-time Setup)** 선택
3. **Run workflow** 버튼 클릭
4. 배포 완료 확인:
   ```bash
   npm info @vue-pivottable/subtotal-renderer
   ```

---

## 2단계: OIDC Trusted Publishing 설정

최초 배포가 완료되면 토큰 없이 자동 배포가 가능하도록 설정합니다.

### 2.1 NPM에서 Trusted Publishing 연동

1. [npmjs.com](https://www.npmjs.com) → **@vue-pivottable/subtotal-renderer** 패키지 페이지
2. **Settings** 탭 → **Publishing access**
3. **Add new provider** 클릭
4. **GitHub Actions** 선택
5. 설정:
   | 항목 | 값 |
   |------|-----|
   | Repository owner | `vue-pivottable` |
   | Repository name | `subtotal-renderer` |
   | Workflow filename | `publish.yml` |
   | Environment | (비워두기) |

### 2.2 설정 확인

- NPM 패키지 Settings 페이지에 GitHub Actions 연동이 표시되면 완료

### 2.3 (선택) NPM_TOKEN Secret 삭제

OIDC 설정 완료 후 `NPM_TOKEN` Secret을 삭제해도 됩니다.
- GitHub 레포 → Settings → Secrets → NPM_TOKEN 삭제

---

## 3단계: 배포 테스트

### develop 브랜치 (베타 배포)

```bash
git checkout -b develop
git push -u origin develop
```

→ 자동으로 `v0.1.1-beta.0` 형태로 베타 배포됨

### main 브랜치 (정식 릴리즈)

```bash
git checkout main
# 코드 변경 후
git push origin main
```

→ 자동으로 버전 업데이트, GitHub Release, NPM 배포

---

## 브랜치 전략

| 브랜치 | 배포 태그 | 용도 |
|--------|----------|------|
| develop | beta | 개발/테스트용 베타 버전 |
| main | latest | 정식 릴리즈 |

- main에서 릴리즈 후 자동으로 main→develop PR 생성 및 머지

---

## 체크리스트

### 최초 배포
- [ ] NPM 계정 이메일 인증 완료
- [ ] NPM Access Token 생성 (Automation 타입)
- [ ] GitHub Secret에 `NPM_TOKEN` 추가
- [ ] `publish-init.yml` 수동 실행
- [ ] NPM에서 패키지 확인 (`npm info @vue-pivottable/subtotal-renderer`)

### OIDC 전환
- [ ] NPM → 패키지 Settings → Trusted Publishing 설정
- [ ] Repository: `vue-pivottable/subtotal-renderer`
- [ ] Workflow filename: `publish.yml`
- [ ] develop 브랜치 생성 및 push하여 베타 배포 테스트
- [ ] (선택) `NPM_TOKEN` Secret 삭제

---

## 트러블슈팅

### OIDC 인증 실패
```
npm error code ENEEDAUTH
```
→ NPM Trusted Publishing 설정 확인, workflow filename이 `publish.yml`인지 확인

### id-token 권한 오류
```
Error: The ACTIONS_ID_TOKEN_REQUEST_URL environment variable is not set
```
→ publish.yml에 `permissions.id-token: write` 있는지 확인

### release-it 실패
```
ERROR Not authenticated with npm
```
→ OIDC 설정 전이면 NPM_TOKEN 필요, 설정 후면 NPM 연동 상태 확인

---

## 참고 자료

- [NPM OIDC Trusted Publishing 공식 문서](https://docs.npmjs.com/generating-provenance-statements)
- [release-it GitHub](https://github.com/release-it/release-it)
- private-toolkit 가이드: `~/dev/repository/github/private-toolkit/NPM_PUBLISH_GUIDE.md`
