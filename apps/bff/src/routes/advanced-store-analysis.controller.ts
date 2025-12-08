import { Controller, Get, Param, Query } from '@nestjs/common';
import { PeerBenchmarkingService } from '../services/intelligence/peer-benchmarking.service';
import { PerformanceClusteringService } from '../services/intelligence/performance-clustering.service';
import { TurnoverPredictionService } from '../services/intelligence/turnover-prediction.service';

@Controller('stores')
export class AdvancedStoreAnalysisController {
  constructor(
    private peerBenchmarking: PeerBenchmarkingService,
    private performanceClustering: PerformanceClusteringService,
    private turnoverPrediction: TurnoverPredictionService,
  ) {}

  @Get(':id/peer-benchmark')
  async getPeerBenchmark(@Param('id') storeId: string) {
    return this.peerBenchmarking.benchmarkStore(storeId);
  }

  @Get(':id/performance-cluster')
  async getPerformanceCluster(@Param('id') storeId: string) {
    return this.performanceClustering.clusterStores(storeId);
  }

  @Get(':id/turnover-prediction')
  async getTurnoverPrediction(@Param('id') storeId: string) {
    return this.turnoverPrediction.predictTurnover(storeId);
  }

  @Get(':id/advanced-analysis')
  async getAdvancedAnalysis(@Param('id') storeId: string) {
    // Get all analyses in parallel
    const [benchmark, clustering, prediction] = await Promise.all([
      this.peerBenchmarking.benchmarkStore(storeId),
      this.performanceClustering.clusterStores(storeId),
      this.turnoverPrediction.predictTurnover(storeId),
    ]);

    return {
      storeId,
      benchmark,
      clustering,
      prediction,
      generatedAt: new Date().toISOString(),
    };
  }

  @Get('network/clusters')
  async getNetworkClusters() {
    return this.performanceClustering.clusterStores();
  }
}
