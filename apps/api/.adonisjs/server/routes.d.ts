import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'auth.register': { paramsTuple?: []; params?: {} }
    'auth.login': { paramsTuple?: []; params?: {} }
    'auth.refresh': { paramsTuple?: []; params?: {} }
    'auth.me': { paramsTuple?: []; params?: {} }
    'auth.logout': { paramsTuple?: []; params?: {} }
    'projects.index': { paramsTuple?: []; params?: {} }
    'projects.store': { paramsTuple?: []; params?: {} }
    'projects.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'projects.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'projects.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'endpoints.index': { paramsTuple: [ParamValue]; params: {'projectId': ParamValue} }
    'endpoints.store': { paramsTuple: [ParamValue]; params: {'projectId': ParamValue} }
    'endpoints.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'endpoints.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'endpoints.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'endpoints.toggle': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'team.index': { paramsTuple: [ParamValue]; params: {'projectId': ParamValue} }
    'team.invite': { paramsTuple: [ParamValue]; params: {'projectId': ParamValue} }
    'team.update_role': { paramsTuple: [ParamValue,ParamValue]; params: {'projectId': ParamValue,'memberId': ParamValue} }
    'team.remove_member': { paramsTuple: [ParamValue,ParamValue]; params: {'projectId': ParamValue,'memberId': ParamValue} }
    'team.revoke_invite': { paramsTuple: [ParamValue,ParamValue]; params: {'projectId': ParamValue,'inviteId': ParamValue} }
    'team.my_memberships': { paramsTuple?: []; params?: {} }
    'version.index': { paramsTuple: [ParamValue]; params: {'projectId': ParamValue} }
    'version.store': { paramsTuple: [ParamValue]; params: {'projectId': ParamValue} }
    'version.show': { paramsTuple: [ParamValue,ParamValue]; params: {'projectId': ParamValue,'id': ParamValue} }
    'version.restore': { paramsTuple: [ParamValue,ParamValue]; params: {'projectId': ParamValue,'id': ParamValue} }
    'invite.pending': { paramsTuple?: []; params?: {} }
    'invite.show': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'invite.accept': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'mock.execute': { paramsTuple: [ParamValue,...ParamValue[]]; params: {'projectSlug': ParamValue,'*': ParamValue[]} }
  }
  POST: {
    'auth.register': { paramsTuple?: []; params?: {} }
    'auth.login': { paramsTuple?: []; params?: {} }
    'auth.refresh': { paramsTuple?: []; params?: {} }
    'auth.logout': { paramsTuple?: []; params?: {} }
    'projects.store': { paramsTuple?: []; params?: {} }
    'endpoints.store': { paramsTuple: [ParamValue]; params: {'projectId': ParamValue} }
    'team.invite': { paramsTuple: [ParamValue]; params: {'projectId': ParamValue} }
    'version.store': { paramsTuple: [ParamValue]; params: {'projectId': ParamValue} }
    'version.restore': { paramsTuple: [ParamValue,ParamValue]; params: {'projectId': ParamValue,'id': ParamValue} }
    'invite.accept': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'mock.execute': { paramsTuple: [ParamValue,...ParamValue[]]; params: {'projectSlug': ParamValue,'*': ParamValue[]} }
  }
  GET: {
    'auth.me': { paramsTuple?: []; params?: {} }
    'projects.index': { paramsTuple?: []; params?: {} }
    'projects.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'endpoints.index': { paramsTuple: [ParamValue]; params: {'projectId': ParamValue} }
    'endpoints.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'team.index': { paramsTuple: [ParamValue]; params: {'projectId': ParamValue} }
    'team.my_memberships': { paramsTuple?: []; params?: {} }
    'version.index': { paramsTuple: [ParamValue]; params: {'projectId': ParamValue} }
    'version.show': { paramsTuple: [ParamValue,ParamValue]; params: {'projectId': ParamValue,'id': ParamValue} }
    'invite.pending': { paramsTuple?: []; params?: {} }
    'invite.show': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'mock.execute': { paramsTuple: [ParamValue,...ParamValue[]]; params: {'projectSlug': ParamValue,'*': ParamValue[]} }
  }
  HEAD: {
    'auth.me': { paramsTuple?: []; params?: {} }
    'projects.index': { paramsTuple?: []; params?: {} }
    'projects.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'endpoints.index': { paramsTuple: [ParamValue]; params: {'projectId': ParamValue} }
    'endpoints.show': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'team.index': { paramsTuple: [ParamValue]; params: {'projectId': ParamValue} }
    'team.my_memberships': { paramsTuple?: []; params?: {} }
    'version.index': { paramsTuple: [ParamValue]; params: {'projectId': ParamValue} }
    'version.show': { paramsTuple: [ParamValue,ParamValue]; params: {'projectId': ParamValue,'id': ParamValue} }
    'invite.pending': { paramsTuple?: []; params?: {} }
    'invite.show': { paramsTuple: [ParamValue]; params: {'token': ParamValue} }
    'mock.execute': { paramsTuple: [ParamValue,...ParamValue[]]; params: {'projectSlug': ParamValue,'*': ParamValue[]} }
  }
  PUT: {
    'projects.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'endpoints.update': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'team.update_role': { paramsTuple: [ParamValue,ParamValue]; params: {'projectId': ParamValue,'memberId': ParamValue} }
    'mock.execute': { paramsTuple: [ParamValue,...ParamValue[]]; params: {'projectSlug': ParamValue,'*': ParamValue[]} }
  }
  DELETE: {
    'projects.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'endpoints.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'team.remove_member': { paramsTuple: [ParamValue,ParamValue]; params: {'projectId': ParamValue,'memberId': ParamValue} }
    'team.revoke_invite': { paramsTuple: [ParamValue,ParamValue]; params: {'projectId': ParamValue,'inviteId': ParamValue} }
    'mock.execute': { paramsTuple: [ParamValue,...ParamValue[]]; params: {'projectSlug': ParamValue,'*': ParamValue[]} }
  }
  PATCH: {
    'endpoints.toggle': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'mock.execute': { paramsTuple: [ParamValue,...ParamValue[]]; params: {'projectSlug': ParamValue,'*': ParamValue[]} }
  }
  OPTIONS: {
    'mock.execute': { paramsTuple: [ParamValue,...ParamValue[]]; params: {'projectSlug': ParamValue,'*': ParamValue[]} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}