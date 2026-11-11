const PageBackground = () => {
  return (
    <div className='fixed inset-0 w-full h-full -z-10 overflow-hidden bg-gradient-to-br from-[#fffafc] via-white to-[#f3f9fd] dark:from-[#0b0b12] dark:via-[#101019] dark:to-[#0a1015]'>
      {/* 极光光斑 —— 缓慢漂浮 */}
      <div className='sc-float-slow absolute -top-[14%] -left-[8%] w-[520px] h-[520px] rounded-full bg-primary-200/25 blur-[110px]' />
      <div className='sc-float-slower absolute top-[16%] -right-[10%] w-[440px] h-[440px] rounded-full bg-secondary-200/25 blur-[100px]' />
      <div className='sc-float-slow absolute -bottom-[16%] left-[22%] w-[600px] h-[600px] rounded-full bg-pink-200/20 blur-[120px] dark:bg-primary-900/20' />

      {/* 细网格纹理：让大平面不空 */}
      <div
        className='absolute inset-0 opacity-[0.35] dark:opacity-[0.18]'
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(148,163,184,0.10) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.10) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
          maskImage:
            'radial-gradient(circle at 50% 30%, black 0%, transparent 78%)',
          WebkitMaskImage:
            'radial-gradient(circle at 50% 30%, black 0%, transparent 78%)',
        }}
      />

      {/* 顶部高光，模拟环境光 */}
      <div className='absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/70 to-transparent dark:from-white/[0.04]' />
    </div>
  );
};

export default PageBackground;
