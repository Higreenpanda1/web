import * as migration_20260920_072112_initial from './20260920_072112_initial'
import * as migration_20260923_073515_add_catalogue_and_applications from './20260923_073515_add_catalogue_and_applications'
import * as migration_20260924_050126_blog_seo_automation from './20260924_050126_blog_seo_automation'
import * as migration_20260925_134518_blog_research_automation from './20260925_134518_blog_research_automation'
import * as migration_20261005_172943_field_visits from './20261005_172943_field_visits'
import * as migration_20261008_150000_founder_credentials from './20261008_150000_founder_credentials'
import * as migration_20261021_080000_field_story from './20261021_080000_field_story'
import * as migration_20261023_131921_chinese_locale from './20261023_131921_chinese_locale'
import * as migration_20261026_120000_hubspot_sync from './20261026_120000_hubspot_sync'
import * as migration_20261026_130018_product_order from './20261026_130018_product_order'

export const migrations = [
  {
    up: migration_20260920_072112_initial.up,
    down: migration_20260920_072112_initial.down,
    name: '20260920_072112_initial',
  },
  {
    up: migration_20260923_073515_add_catalogue_and_applications.up,
    down: migration_20260923_073515_add_catalogue_and_applications.down,
    name: '20260923_073515_add_catalogue_and_applications',
  },
  {
    up: migration_20260924_050126_blog_seo_automation.up,
    down: migration_20260924_050126_blog_seo_automation.down,
    name: '20260924_050126_blog_seo_automation',
  },
  {
    up: migration_20260925_134518_blog_research_automation.up,
    down: migration_20260925_134518_blog_research_automation.down,
    name: '20260925_134518_blog_research_automation',
  },
  {
    up: migration_20261005_172943_field_visits.up,
    down: migration_20261005_172943_field_visits.down,
    name: '20261005_172943_field_visits',
  },
  {
    up: migration_20261008_150000_founder_credentials.up,
    down: migration_20261008_150000_founder_credentials.down,
    name: '20261008_150000_founder_credentials',
  },
  {
    up: migration_20261021_080000_field_story.up,
    down: migration_20261021_080000_field_story.down,
    name: '20261021_080000_field_story',
  },
  {
    up: migration_20261023_131921_chinese_locale.up,
    down: migration_20261023_131921_chinese_locale.down,
    name: '20261023_131921_chinese_locale',
  },
  {
    up: migration_20261026_120000_hubspot_sync.up,
    down: migration_20261026_120000_hubspot_sync.down,
    name: '20261026_120000_hubspot_sync',
  },
  {
    up: migration_20261026_130018_product_order.up,
    down: migration_20261026_130018_product_order.down,
    name: '20261026_130018_product_order',
  },
]
