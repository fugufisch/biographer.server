#!/usr/bin/python
# -*- coding: iso-8859-15 -*-

from copy import deepcopy
from randomid import randomID
import json				# JSON exchange format
import re				# regular expressions, used for graphviz output parsing

from defaults import *
from SBO_terms import *
from data import Data


### Node object definition ###

class Node:
	def __init__(self, JSON=None, defaults=False):			# input may be string or dictionary
		if defaults:
			self.__dict__.update( deepcopy(DefaultNode) )
		if JSON is not None:
			if type(JSON) == type(""):
				JSON = json.loads(JSON)
			self.__dict__.update( deepcopy(JSON) )		# map all input key/value pairs to the python object
			# after that self.data will be a dictionary
			# we don't want that, we want to access all parameters in the way node.data.subnodes etc...
		if not self.owns('data'):
			self.data = {}
		self.data = Data(self.data)

	def owns(self, key1, key2=None, key3=None):
		if key2 is None:
			return key1 in self.__dict__.keys()
		if key3 is None:
			return self.owns(key1) and self.owns(key2)
		return self.owns(key1) and self.owns(key2) and self.owns(key3)

	def update_using_graphviz_output( self, dot ):
		if not self.owns("data"):
			self.data = Data()

		r = re.compile('[\d\.]+')

		key = 'pos="'
		p = dot.find(key)
		if p == -1:
			return False
		p += len(key)
		q = dot.find('"', p)
		pos = r.findall( dot[p:q] )
		self.data.x = pos[0]
		self.data.y = pos[1]

		key = 'width="'
		p = dot.find(key)
		if p == -1:
			return False
		p += len(key)
		q = dot.find('"', p)
		self.data.width = int( float( r.findall(dot[p:q])[0] ) *70)		# temporary workaround	# future

		key = 'height="'
		p = dot.find(key)
		if p == -1:
			return False
		p += len(key)
		q = dot.find('"', p)
		self.data.height = int( float( r.findall(dot[p:q])[0] ) *70)		# temporary workaround

		return str(self.id)+" is now at ( "+str(self.data.x)+" | "+str(self.data.y)+" ), width = "+str(self.data.width)+", height = "+str(self.data.height)

	def exportJSON(self, Indent=DefaultIndent):			# export Node as JSON string
		return json.dumps( self.exportDICT(), indent=Indent )

	def exportDICT(self):
		me = deepcopy(self.__dict__)				# convert self to dictionary
		me['data'] = self.data.exportDICT()
		if "ConnectedEdges" in me.keys():			# do not export ConnectedEdges,
			del me["ConnectedEdges"]
		if "SubNodes" in me.keys():				# SubNodes,
			del me["SubNodes"]
		if "CompartmentNode" in me.keys():			# and the CompartmentNode
			del me["CompartmentNode"]
		return me

	def export_to_Layouter(self):
		return {
			'id'		: self.id, \
			'type'		: self.type, \
			'compartment'	: self.data.compartment, \
			'x'		: self.data.x, \
			'y'		: self.data.y, \
			'width'		: self.data.width, \
			'height'	: self.data.height, \
			'direction'	: ''
			}

	def import_from_Layouter(self, layout):
		self.type		= layout['type']
		self.id			= layout['id']
		self.data.compartment 	= layout['compartment']
		self.data.x		= layout['x']
		self.data.y		= layout['y']
		self.data.width		= layout['width']
		self.data.height	= layout['height']

	def selfcheck(self):						# perform some basic integrity checks
		result = ""
		show = False

		for key in self.__dict__.keys():				# check if we recognize all keys
			if not key in ["ConnectedEdges", "SubNodes", "CompartmentNode"]:	# else skip it ...
				if key in NodeKeyAliases.keys():		# is it an alias ...
					newkey = NodeKeyAliases[key]
					result += 'Format error: '+self.id+'.'+key+' moved to '+self.id+'.'+newkey+'\n'
					self.__dict__[newkey] = self.__dict__[key]
					del self.__dict__[key]
					key = newkey
				if not key in NodeKeys:
					if key in OptionalNodeKeys:		# is it an optional key ...
						result += 'Format error: '+self.id+'.'+key+'" moved to '+self.id+'.data.'+key+'\n'
						self.data.__dict__[key] = self.__dict__[key]
						del self.__dict__[key]
					else:
						result += 'Format error: Unrecognized Node property "'+key+'" !\n'
						show = True

		for key in self.data.__dict__.keys():				# check optional keys
			if key in NodeKeyAliases.keys():		# is it an alias ...
				newkey = NodeKeyAliases[key]
				result += 'Format error: '+self.id+'.data.'+key+' moved to '+self.id+'.data.'+newkey+'\n'
				self.data.__dict__[newkey] = self.data.__dict__[key]
				del self.data.__dict__[key]
				key = newkey
			if not key in OptionalNodeKeys:
				if key == 'id':
					if not self.owns('id'):
						result += 'Format error: '+self.id+'.data.id moved to '+self.id+'.id\n'
						self.id = self.data.id
						self.data.id = randomID()
				elif key in NodeKeys:			# is it a mandatory key ...
					result += 'Format error: '+self.id+'.data.'+key+' moved to '+self.id+'.'+key+'\n'
					self.__dict__[key] = self.data.__dict__[key]
					del self.data.__dict__[key]
				else:
					result += 'Format error: Unrecognized optional Node property "'+key+'" !\n'
					show = True

		for key in MandatoryNodeKeys:				# check mandatory keys
			if not self.owns(key):
				result += 'Error: '+self.id+'.'+key+' undefined but mandatory !\n'
				show = True

		if str(self.id) == "-1":				# check ID
			result += "Error: Node ID -1 is not allowed !\n"
			show = True
		if type(self.id) == type(0):
			if self.id < 0:
				result += "Warning: Node ID < 0 !\n"
				show = True

		if self.data.owns("compartment") and ( type(self.data.compartment) == type(0) ):	# check compartment
			if self.data.compartment < 0 and self.type in [0,3]:
				result += "Warning: Node compartment < 0 !\n"
				show = True
									# check visual properties
		if self.data.owns("width") is not self.data.owns("height"):
			result += "Warning: Incomplete information on Node size !\n"
			show = True

		if show:						# if errors: show source
			result += "Node contains errors: "+self.exportJSON()+"\n"
		return result
