import { createPackedJobsProfile, packageNames } from '../tests/packed-profile.mjs'

let fixture
try {
  fixture = await createPackedJobsProfile()
  console.log(`Verified external DSH CLI: ${fixture.dsh.version}`)
  console.log(`Verified Jobs App packed-install: ${packageNames.jobs}`)
  console.log(`Verified profile bundle order: @deepseek-ai/dsh-base -> @deepseek-ai/dsh-web-app -> ${packageNames.webpage} -> ${packageNames.jobs}`)
  console.log(`Verified dump-config contains one ordered webpage then jobs-app row.`)
  console.log('Jobs App packed-install/profile verification passed.')
} catch (error) {
  console.error(error instanceof Error ? error.stack : error)
  process.exitCode = 1
} finally {
  await fixture?.dispose()
}
