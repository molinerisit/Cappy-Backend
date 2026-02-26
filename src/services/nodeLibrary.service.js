const mongoose = require('mongoose');
const LearningNode = require('../models/LearningNode.model');
const LearningPath = require('../models/LearningPath.model');
const NodeGroup = require('../models/NodeGroup.model');

/**
 * NodeLibraryService
 * 
 * Biblioteca global de nodos
 * - Búsqueda y filtrado avanzado
 * - Estadísticas globales
 * - Exportación
 * - Análisis de reutilización
 */
class NodeLibraryService {
  /**
   * Obtener todos los nodos con paginación
   */
  static async getAllNodes(filters = {}, page = 1, limit = 50) {
    try {
      const skip = (page - 1) * limit;
      const query = { isDeleted: false };

      // Aplicar filtros
      if (filters.type) query.type = filters.type;
      if (filters.status) query.status = filters.status;
      if (filters.difficulty) query.difficulty = filters.difficulty;
      if (filters.pathId) query.pathId = filters.pathId;
      if (filters.groupId) query.groupId = filters.groupId;
      if (filters.isLinked !== undefined) query.isLinked = filters.isLinked;

      const totalCount = await LearningNode.countDocuments(query);

      const nodes = await LearningNode.find(query)
        .populate('pathId', 'title countryId')
        .populate('groupId', 'title')
        .select('title type level positionIndex status xpReward difficulty createdAt updatedAt isLinked originalNodeId')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      // Calcular uso (cuántas veces está linkeado)
      const nodesWithUsage = await Promise.all(
        nodes.map(async (node) => {
          const linkedCount = await LearningNode.countDocuments({
            originalNodeId: node._id,
            isDeleted: false
          });

          return {
            ...node,
            reuseCount: linkedCount
          };
        })
      );

      return {
        nodes: nodesWithUsage,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasMore: page * limit < totalCount
        }
      };
    } catch (error) {
      throw new Error(`Error al obtener nodos: ${error.message}`);
    }
  }

  /**
   * Buscar nodos con texto
   */
  static async searchNodes(query, filters = {}, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;

      const searchQuery = {
        isDeleted: false,
        $or: [
          { title: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
          { tags: { $in: [new RegExp(query, 'i')] } }
        ]
      };

      // Aplicar filtros adicionales
      if (filters.type) searchQuery.type = filters.type;
      if (filters.status) searchQuery.status = filters.status;
      if (filters.difficulty) searchQuery.difficulty = filters.difficulty;
      if (filters.pathId) searchQuery.pathId = filters.pathId;

      const totalCount = await LearningNode.countDocuments(searchQuery);

      const nodes = await LearningNode.find(searchQuery)
        .populate('pathId', 'title countryId')
        .populate('groupId', 'title')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      return {
        nodes,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasMore: page * limit < totalCount
        }
      };
    } catch (error) {
      throw new Error(`Error en búsqueda: ${error.message}`);
    }
  }

  /**
   * Obtener nodos por tipo
   */
  static async getNodesByType(type, page = 1, limit = 50) {
    return this.getAllNodes({ type }, page, limit);
  }

  /**
   * Obtener nodos por path
   */
  static async getNodesByPath(pathId, page = 1, limit = 50) {
    return this.getAllNodes({ pathId }, page, limit);
  }

  /**
   * Obtener nodos más reutilizados
   */
  static async getMostReusedNodes(limit = 20) {
    try {
      // Obtener nodos originales con conteo de links
      const pipeline = [
        { $match: { isDeleted: false, isLinked: false } },
        {
          $lookup: {
            from: 'learningnodes',
            let: { nodeId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$originalNodeId', '$$nodeId'] },
                      { $eq: ['$isDeleted', false] }
                    ]
                  }
                }
              },
              { $count: 'count' }
            ],
            as: 'linkedCount'
          }
        },
        {
          $addFields: {
            reuseCount: {
              $ifNull: [{ $arrayElemAt: ['$linkedCount.count', 0] }, 0]
            }
          }
        },
        { $match: { reuseCount: { $gt: 0 } } },
        { $sort: { reuseCount: -1 } },
        { $limit: limit },
        {
          $lookup: {
            from: 'learningpaths',
            localField: 'pathId',
            foreignField: '_id',
            as: 'path'
          }
        },
        {
          $lookup: {
            from: 'nodegroups',
            localField: 'groupId',
            foreignField: '_id',
            as: 'group'
          }
        },
        {
          $project: {
            title: 1,
            type: 1,
            level: 1,
            xpReward: 1,
            difficulty: 1,
            status: 1,
            reuseCount: 1,
            path: { $arrayElemAt: ['$path.title', 0] },
            group: { $arrayElemAt: ['$group.title', 0] },
            createdAt: 1,
            updatedAt: 1
          }
        }
      ];

      const nodes = await LearningNode.aggregate(pipeline);
      return nodes;
    } catch (error) {
      throw new Error(`Error al obtener nodos más reutilizados: ${error.message}`);
    }
  }

  /**
   * Obtener nodos recientemente modificados
   */
  static async getRecentlyModified(limit = 20) {
    try {
      const nodes = await LearningNode.find({ isDeleted: false })
        .populate('pathId', 'title countryId')
        .populate('groupId', 'title')
        .sort({ updatedAt: -1 })
        .limit(limit)
        .lean();

      return nodes;
    } catch (error) {
      throw new Error(`Error al obtener nodos recientes: ${error.message}`);
    }
  }

  /**
   * Obtener estadísticas globales
   */
  static async getLibraryStats() {
    try {
      const [
        totalNodes,
        nodesByType,
        nodesByStatus,
        nodesByDifficulty,
        totalLinkedNodes,
        avgReuseStats,
        topPaths
      ] = await Promise.all([
        // Total de nodos
        LearningNode.countDocuments({ isDeleted: false }),

        // Nodos por tipo
        LearningNode.aggregate([
          { $match: { isDeleted: false } },
          { $group: { _id: '$type', count: { $sum: 1 } } }
        ]),

        // Nodos por estado
        LearningNode.aggregate([
          { $match: { isDeleted: false } },
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ]),

        // Nodos por dificultad
        LearningNode.aggregate([
          { $match: { isDeleted: false } },
          { $group: { _id: '$difficulty', count: { $sum: 1 } } }
        ]),

        // Total linked nodes
        LearningNode.countDocuments({ isDeleted: false, isLinked: true }),

        // Estadísticas de reutilización
        LearningNode.aggregate([
          { $match: { isDeleted: false, isLinked: false } },
          {
            $lookup: {
              from: 'learningnodes',
              let: { nodeId: '$_id' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $eq: ['$originalNodeId', '$$nodeId'] },
                        { $eq: ['$isDeleted', false] }
                      ]
                    }
                  }
                },
                { $count: 'count' }
              ],
              as: 'linkedCount'
            }
          },
          {
            $addFields: {
              reuseCount: {
                $ifNull: [{ $arrayElemAt: ['$linkedCount.count', 0] }, 0]
              }
            }
          },
          {
            $group: {
              _id: null,
              avgReuseCount: { $avg: '$reuseCount' },
              maxReuseCount: { $max: '$reuseCount' }
            }
          }
        ]),

        // Top paths con más nodos
        LearningNode.aggregate([
          { $match: { isDeleted: false } },
          { $group: { _id: '$pathId', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 5 },
          {
            $lookup: {
              from: 'learningpaths',
              localField: '_id',
              foreignField: '_id',
              as: 'path'
            }
          },
          {
            $project: {
              pathTitle: { $arrayElemAt: ['$path.title', 0] },
              nodeCount: '$count'
            }
          }
        ])
      ]);

      // Formatear resultados
      const stats = {
        totalNodes,
        nodesByType: nodesByType.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        nodesByStatus: nodesByStatus.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        nodesByDifficulty: nodesByDifficulty.reduce((acc, item) => {
          acc[item._id || 'unspecified'] = item.count;
          return acc;
        }, {}),
        totalLinkedNodes,
        avgReuseCount: avgReuseStats[0]?.avgReuseCount || 0,
        maxReuseCount: avgReuseStats[0]?.maxReuseCount || 0,
        topPaths
      };

      return stats;
    } catch (error) {
      throw new Error(`Error al obtener estadísticas: ${error.message}`);
    }
  }

  /**
   * Obtener dependencias de un nodo
   */
  static async getNodeDependencies(nodeId) {
    try {
      const node = await LearningNode.findById(nodeId);
      if (!node) {
        throw new Error('Nodo no encontrado');
      }

      const dependencies = {
        linkedIn: [],
        requiredBy: [],
        unlocks: []
      };

      // Buscar nodos que referencian a este nodo (linked copies)
      if (!node.isLinked) {
        dependencies.linkedIn = await LearningNode.find({
          originalNodeId: nodeId,
          isDeleted: false
        })
          .populate('pathId', 'title')
          .select('title pathId level positionIndex')
          .lean();
      }

      // TODO: Implementar relaciones de prerrequisitos cuando se agreguen
      // dependencies.requiredBy = await LearningNode.find({ prerequisites: nodeId });
      // dependencies.unlocks = node.unlocks;

      return dependencies;
    } catch (error) {
      throw new Error(`Error al obtener dependencias: ${error.message}`);
    }
  }

  /**
   * Exportar nodos como JSON
   */
  static async exportNodesToJSON(pathId = null) {
    try {
      const query = { isDeleted: false };
      if (pathId) query.pathId = pathId;

      const nodes = await LearningNode.find(query)
        .populate('pathId', 'title countryId')
        .populate('groupId', 'title')
        .lean();

      return {
        exportDate: new Date().toISOString(),
        totalNodes: nodes.length,
        pathFilter: pathId,
        nodes
      };
    } catch (error) {
      throw new Error(`Error al exportar nodos: ${error.message}`);
    }
  }
}

module.exports = NodeLibraryService;
