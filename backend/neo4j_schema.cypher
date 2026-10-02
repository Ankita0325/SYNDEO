// =============================================================================
// SYNDEO: Multi-Hop Personal Identity Graph Schema (Neo4j Cypher)
// =============================================================================

// 1. Constraints & Unique Indexes
CREATE CONSTRAINT unique_person_id IF NOT EXISTS FOR (p:Person) REQUIRE p.person_id IS UNIQUE;
CREATE CONSTRAINT unique_document_hash IF NOT EXISTS FOR (d:Document) REQUIRE d.sha256_hash IS UNIQUE;
CREATE CONSTRAINT unique_share_token IF NOT EXISTS FOR (s:ShareScope) REQUIRE s.share_token IS UNIQUE;

// 2. Sample Graph Traversal Cypher Pattern
// Match all claims backed by documents verified by a specific organization or category:
// MATCH (p:Person {person_id: $person_id})-[r1:HAS_CLAIM]->(c:Claim)-[r2:BACKED_BY]->(d:Document)
// WHERE c.category = $category
// RETURN p, c, d;

// 3. Multi-hop Proof Composition Query Pattern:
// MATCH (p:Person {person_id: $person_id})-[r:HAS_CLAIM]->(c:Claim)
// WHERE c.field_name IN $allowed_fields AND c.status = 'ACTIVE'
// OPTIONAL MATCH (c)-[:BACKED_BY]->(d:Document)
// RETURN c.field_name AS field, c.field_value AS value, c.confidence AS confidence, d.file_name AS doc_name, d.sha256_hash AS doc_hash;
