const loaders = {
  vercel: () => import('@astrojs/vercel'),
  cloudflare: () => import('@astrojs/cloudflare'),
};

export function resolveDeployment(settings = {}, env = process.env) {
  const output = env.SITE_OUTPUT ?? settings.output ?? 'static';
  const target = env.DEPLOY_TARGET ?? settings.deployTarget ?? null;
  if (!['static', 'server'].includes(output)) {
    throw new Error('SITE_OUTPUT/output must be static or server.');
  }
  if (target !== null && !['vercel', 'cloudflare'].includes(target)) {
    throw new Error('DEPLOY_TARGET/deployTarget must be vercel or cloudflare; use null in site.config.mjs if undecided.');
  }
  if (output === 'server' && target === null) {
    throw new Error('Choose vercel or cloudflare before building server output.');
  }
  const provider = settings.inquiry?.provider ?? 'none';
  if (!['none', 'rxcms'].includes(provider)) throw new Error('inquiry.provider must be none or rxcms.');
  if (provider === 'rxcms' && (output !== 'static' || target === null)) {
    throw new Error('The bundled inquiry functions require static plus vercel/cloudflare. For server, implement a native runtime route explicitly.');
  }
  if (provider === 'rxcms' && !settings.inquiry.turnstileSiteKey) throw new Error('Configure the public Turnstile site key before enabling inquiries.');
  return { output, target };
}

// Lazy imports keep both adapters and their runtimes out of static builds.
// Loader injection allows selection tests without starting a platform runtime.
export async function deploymentConfig(settings, env = process.env, adapterLoaders = loaders) {
  const { output, target } = resolveDeployment(settings, env);
  if (output === 'static') return { output };
  let module;
  try {
    module = await adapterLoaders[target]();
  } catch (cause) {
    throw new Error(`Cannot load @astrojs/${target}. Install an Astro-compatible version before a server build.`, { cause });
  }
  return { output, adapter: module.default() };
}
