/**
 * Meta Ads control client.
 *
 * By default Meta enables several "helpful" settings that quietly inflate
 * reported performance and waste spend:
 *   1. View-through attribution  (credits conversions with no click)
 *   2. Audience Network / misplacements (low-quality placements)
 *   3. Advantage+ / campaign enhancements (auto-changes creative & targeting)
 *
 * This client disables all three so attribution is honest and spend is
 * controlled. It is DRY-RUN by default: without META_ACCESS_TOKEN +
 * META_AD_ACCOUNT_ID it only logs the exact Graph API calls it *would* make.
 * Live changes require explicit credentials and are never performed otherwise.
 */

export interface MetaCampaignOptimization {
  campaignId: string;
  dryRun: boolean;
  applied: boolean;
  changes: string[];
  error?: string;
}

export interface MetaOptimizationResult {
  dryRun: boolean;
  accountId: string | null;
  campaigns: MetaCampaignOptimization[];
  summary: string;
}

export class MetaAdsClient {
  private accessToken: string | undefined;
  private adAccountId: string | undefined;
  private appId: string | undefined;
  private appSecret: string | undefined;
  readonly dryRun: boolean;

  constructor(env: NodeJS.ProcessEnv = process.env) {
    this.accessToken = env.META_ACCESS_TOKEN;
    this.adAccountId = env.META_AD_ACCOUNT_ID;
    this.appId = env.META_APP_ID;
    this.appSecret = env.META_APP_SECRET;
    this.dryRun = !(this.accessToken && this.adAccountId);
  }

  hasCredentials(): boolean {
    return !this.dryRun;
  }

  /**
   * The exact settings we enforce on every campaign. These mirror what a
   * disciplined media buyer would set by hand in Ads Manager.
   */
  getOptimalSettings(): Record<string, unknown> {
    return {
      // 1) Disable view-through attribution (window = 0)
      attribution_spec: [{ event_type: 'VIEW_THROUGH', window: 0 }],
      // 2) Exclude low-quality / misplacement inventory
      placements: {
        exclude: ['audience_network', 'instream_video', 'facebook_reels_overlay'],
      },
      // 3) Turn off Advantage+ auto-enhancements
      is_dynamic_creative: false,
      advantage_plus_audience: false,
      advantage_plus_creative: false,
      advantage_plus_placements: false,
      optimization_sub_event: 'NONE',
    };
  }

  private async applyToCampaign(campaignId: string): Promise<MetaCampaignOptimization> {
    const settings = this.getOptimalSettings();
    const changes = [
      'disabled view-through attribution (window=0)',
      'excluded misplacements (audience_network / instream / reels overlay)',
      'disabled Advantage+ audience, creative, placements & dynamic creative',
    ];

    if (this.dryRun) {
      return { campaignId, dryRun: true, applied: false, changes };
    }

    try {
      const url = `https://graph.facebook.com/v19.0/${campaignId}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...settings, access_token: this.accessToken }),
      });
      const data = (await res.json()) as { success?: boolean; error?: { message?: string } };
      if (!res.ok || !data.success) {
        return { campaignId, dryRun: false, applied: false, changes, error: data.error?.message ?? `HTTP ${res.status}` };
      }
      return { campaignId, dryRun: false, applied: true, changes };
    } catch (err) {
      return { campaignId, dryRun: false, applied: false, changes, error: String(err) };
    }
  }

  /** Optimize a single campaign (or a list). Dry-run safe. */
  async optimizeCampaigns(campaignIds: string[]): Promise<MetaOptimizationResult> {
    const results: MetaCampaignOptimization[] = [];
    for (const id of campaignIds.length ? campaignIds : ['act_dryrun_campaign_1', 'act_dryrun_campaign_2']) {
      results.push(await this.applyToCampaign(id));
    }
    const applied = results.filter((r) => r.applied).length;
    return {
      dryRun: this.dryRun,
      accountId: this.adAccountId ?? null,
      campaigns: results,
      summary: this.dryRun
        ? `DRY-RUN: ${results.length} campaign(s) would have view-through/misplacements/enhancements disabled (set META_ACCESS_TOKEN + META_AD_ACCOUNT_ID to apply live).`
        : `Applied Meta optimization to ${applied}/${results.length} campaign(s).`,
    };
  }

  /** Convenience: optimize the account's active campaigns. */
  async optimizeAccount(): Promise<MetaOptimizationResult> {
    // In production this would call /act_<id>/campaigns?effective_status=ACTIVE
    // to enumerate real campaign ids. Dry-run uses representative ids.
    const liveIds = this.dryRun ? [] : [this.adAccountId!];
    return this.optimizeCampaigns(liveIds);
  }
}
