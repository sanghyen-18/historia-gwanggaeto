/* =========================================================================
 * 문구·타이밍 설정 — 페이지에 나오는 글은 전부 여기서 바꾸면 됩니다.
 *  - 줄바꿈은 \n 으로 씁니다.
 *  - in / out: 히어로 스크롤 진행도(0~1). 영상 20초 기준 0.05 = 1초.
 *    장면이 바뀌는 초 ÷ 20 = 값. (현재 영상은 약 8.5초에 기병대 장면으로 넘어감 ≈ 0.42)
 *  - 확인되지 않은 역사 내용은 "[내용 입력]" 그대로 두세요.
 * ========================================================================= */
window.SITE_CONTENT = {
  // 히어로 영상 위 자막. position: 'bottom-left' | 'top-right' | 'bottom-center'
  captions: [
    {
      in: 0.02, out: 0.26, position: 'bottom-left',
      eyebrow: '391년 · 고구려',
      title: '열여덟 살의 왕이\n즉위하다',
    },
    {
      in: 0.34, out: 0.6, position: 'top-right',
      eyebrow: '광개토대왕',
      title: '고구려의 땅을\n넓히러 달려가다',
    },
    {
      in: 0.8, out: 1.01, position: 'bottom-center',
      title: '이제, 그대의 차례다',
      cta: { label: '시간 여행 시작하기 →', href: '#menus' },
      // 모션 줄이기(prefers-reduced-motion) 사용자에게 정지 이미지와 함께 보여줄 자막
      showWhenStatic: true,
    },
  ],

  scrollHint: '스크롤해서 시작하기',
  loadingText: '영상을 불러오는 중',

  menus: {
    title: '어디로 떠나 볼까요?',
    lead: '대화하고, 정복하고, 겨루며 삼국 시대를 배워요.',
    cards: [
      { title: '학습공간', desc: '역사 인물과 대화하며 선택해요', href: '#', img: 'assets/thumb-learn.jpg' },
      { title: '땅따먹기', desc: '퀴즈로 지역을 정복해 삼국을 통일해요', href: '#', img: 'assets/thumb-map.jpg' },
      { title: '보드게임', desc: '팀 대항 삼국 부루마블', href: '#', img: 'assets/thumb-board.jpg' },
      { title: '게시판', desc: '인생네컷과 학습 후기를 나눠요', href: '#', img: 'assets/thumb-board-feed.jpg' },
      { title: '도감', desc: '인물·사건·유물을 다시 살펴봐요', href: '#', img: 'assets/thumb-dex.jpg' },
    ],
  },

  intro: {
    eyebrow: '인물 소개',
    title: '광개토대왕',
    body: [
      '[내용 입력]',
      '[내용 입력]',
    ],
    facts: [
      { label: '재위', value: '[내용 입력]' },
      { label: '연호', value: '[내용 입력]' },
      { label: '본명', value: '[내용 입력]' },
    ],
  },

  conquests: {
    eyebrow: '주요 정복',
    title: '[제목 입력]',
    items: [
      { year: '[연도]', title: '[정복 대상]', desc: '[내용 입력]' },
      { year: '[연도]', title: '[정복 대상]', desc: '[내용 입력]' },
      { year: '[연도]', title: '[정복 대상]', desc: '[내용 입력]' },
      { year: '[연도]', title: '[정복 대상]', desc: '[내용 입력]' },
    ],
  },

  timeline: {
    eyebrow: '연표',
    title: '[제목 입력]',
    items: [
      { year: '[연도]', text: '[내용 입력]' },
      { year: '[연도]', text: '[내용 입력]' },
      { year: '[연도]', text: '[내용 입력]' },
      { year: '[연도]', text: '[내용 입력]' },
      { year: '[연도]', text: '[내용 입력]' },
    ],
  },

  footer: '© 2026 Historia',
};
