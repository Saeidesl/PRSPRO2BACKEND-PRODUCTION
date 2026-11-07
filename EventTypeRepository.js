const EventTypeRepository = {

  SHEET_NAME: '11_EventTypes',
  CACHE_KEY: 'PMS_EVENT_TYPES_READ_V1',
  CACHE_TTL_SECONDS: 60,

  getAll: function() {

    return GoogleSheetsRepository.getAll(
      this.SHEET_NAME
    );

  },

  // Shared short-lived read cache for high-frequency event registration lookups.
  // Raw rows are cached; tenant and permission filtering remains in each service.
  getAllCached: function() {
    let cache = null;
    try {
      cache = CacheService.getScriptCache();
    } catch (error) {
      return this.getAll();
    }
    const cached = cache.get(this.CACHE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) return parsed;
      } catch (error) {
        cache.remove(this.CACHE_KEY);
      }
    }

    const records = this.getAll();
    try {
      const serialized = JSON.stringify(records);
      if (serialized.length <= 30000) {
        cache.put(this.CACHE_KEY, serialized, this.CACHE_TTL_SECONDS);
      }
    } catch (error) {
      // Cache is an optimization only; repository reads remain authoritative.
    }
    return records;
  },

  invalidateReadCache: function() {
    try {
      CacheService.getScriptCache().remove(this.CACHE_KEY);
    } catch (error) {}
  },


  findById: function(id) {

    return GoogleSheetsRepository.findById(
      this.SHEET_NAME,
      id
    );

  },


  findByCode: function(code) {

    return GoogleSheetsRepository.findOne(
      this.SHEET_NAME,
      'Code',
      code
    );

  },


  existsByCode: function(code) {

    return GoogleSheetsRepository.exists(
      this.SHEET_NAME,
      'Code',
      code
    );

  },


  findByWorkflowStepId: function(workflowStepId) {

    return GoogleSheetsRepository.findOne(
      this.SHEET_NAME,
      'WorkflowStepID',
      workflowStepId
    );

  },


  findByDepartmentId: function(departmentId) {

    return GoogleSheetsRepository.findOne(
      this.SHEET_NAME,
      'DepartmentID',
      departmentId
    );

  },


  insert: function(eventType) {

    const created = GoogleSheetsRepository.insert(
      this.SHEET_NAME,
      eventType
    );
    this.invalidateReadCache();
    return created;

  },


  update: function(id, data) {

    const updated = GoogleSheetsRepository.updateById(
      this.SHEET_NAME,
      id,
      data
    );
    this.invalidateReadCache();
    return updated;

  },


  delete: function(id) {

    const deleted = GoogleSheetsRepository.deleteById(
      this.SHEET_NAME,
      id
    );
    this.invalidateReadCache();
    return deleted;

  }

};