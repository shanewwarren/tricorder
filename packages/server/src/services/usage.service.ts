import { execSync } from "child_process";
import type { UsageData } from "@tricorder/shared";

export class UsageService {
	private cachedUsage: UsageData | null = null;
	private lastFetch = 0;
	private readonly pollInterval = 60_000; // 60 seconds

	async getUsage(): Promise<UsageData> {
		const now = Date.now();
		if (this.cachedUsage && now - this.lastFetch < this.pollInterval) {
			return this.cachedUsage;
		}

		const token = this.getOAuthToken();
		if (!token) {
			return { tiers: [], updatedAt: new Date().toISOString(), available: false };
		}

		try {
			const resp = await fetch("https://api.anthropic.com/api/oauth/usage", {
				headers: { Authorization: `Bearer ${token}` },
			});

			if (!resp.ok) {
				return { tiers: [], updatedAt: new Date().toISOString(), available: false };
			}

			const data = await resp.json();
			this.cachedUsage = this.parseUsageResponse(data);
			this.lastFetch = now;
			return this.cachedUsage;
		} catch {
			return { tiers: [], updatedAt: new Date().toISOString(), available: false };
		}
	}

	private getOAuthToken(): string | null {
		try {
			// Read OAuth token from macOS Keychain (same approach as claudecodeusage)
			const result = execSync('security find-generic-password -s "claude.ai" -w 2>/dev/null', {
				encoding: "utf-8",
				timeout: 5000,
			}).trim();
			return result || null;
		} catch {
			return null;
		}
	}

	private parseUsageResponse(data: any): UsageData {
		// Best-effort parsing of undocumented API
		// The exact response shape needs to be discovered at runtime
		// Log the raw response on first successful call for debugging
		const tiers = [];

		if (data.session) {
			tiers.push({
				label: "Session",
				subtitle: "5-hour window",
				percentage: data.session.percentage ?? 0,
				resetIn: data.session.resetIn ?? null,
				dollarAmount: null,
				dollarLimit: null,
			});
		}

		if (data.weekly) {
			tiers.push({
				label: "Weekly",
				subtitle: "7-day window",
				percentage: data.weekly.percentage ?? 0,
				resetIn: data.weekly.resetIn ?? null,
				dollarAmount: null,
				dollarLimit: null,
			});
		}

		if (data.model) {
			tiers.push({
				label: "Sonnet Only",
				subtitle: "Model-specific",
				percentage: data.model.percentage ?? 0,
				resetIn: data.model.resetIn ?? null,
				dollarAmount: null,
				dollarLimit: null,
			});
		}

		if (data.overage) {
			tiers.push({
				label: "Overage",
				subtitle: "Extra usage this month",
				percentage: data.overage.percentage ?? 0,
				resetIn: null,
				dollarAmount: data.overage.amount ?? 0,
				dollarLimit: data.overage.limit ?? 50,
			});
		}

		return {
			tiers,
			updatedAt: new Date().toISOString(),
			available: tiers.length > 0,
		};
	}
}
